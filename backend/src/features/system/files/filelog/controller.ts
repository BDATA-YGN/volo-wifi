import _ from 'lodash';
import { responseError, responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { Request, Response } from 'express';
import { FileLogSchema } from './schema';
import Container from 'typedi';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { FileLog } from '@/generated/prisma/client';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import * as MinioService from '@/features/system/files/minio/service';
import { MINIO_PRIVATE_BUCKET, MINIO_PUBLIC_BUCKET } from '@/config';
import { WebSocketService } from '@/third-party/bdataSocket';
import { toStorageObjectPath } from '@/utils/storage-url';

interface BucketUsage {
  size: number;
  count: number;
}

interface MinioUsageSnapshot {
  totalSize: number;
  totalObjects: number;
  perBucket: Record<string, BucketUsage>;
}

/**
 * MinIO listObjects is an O(n) scan. We cache the result briefly so opening
 * the file manager dashboard doesn't issue a full bucket walk on every render.
 */
let cachedMinioUsage: { ts: number; data: MinioUsageSnapshot } | null = null;
const MINIO_USAGE_TTL_MS = 60_000;

async function collectMinioUsage(): Promise<MinioUsageSnapshot> {
  if (cachedMinioUsage && Date.now() - cachedMinioUsage.ts < MINIO_USAGE_TTL_MS) {
    return cachedMinioUsage.data;
  }

  const buckets = [MINIO_PRIVATE_BUCKET, MINIO_PUBLIC_BUCKET].filter(Boolean) as string[];
  const perBucket: Record<string, BucketUsage> = {};
  let totalSize = 0;
  let totalObjects = 0;

  for (const bucket of buckets) {
    try {
      const result = await MinioService.listFiles(bucket, '');
      let size = 0;
      let count = 0;
      for (const obj of result.objects) {
        size += obj.size || 0;
        count += 1;
      }
      perBucket[bucket] = { size, count };
      totalSize += size;
      totalObjects += count;
    } catch (err: any) {
      logger.warn(`Failed to scan MinIO bucket "${bucket}" for usage stats: ${err.message}`);
      perBucket[bucket] = { size: 0, count: 0 };
    }
  }

  const snapshot: MinioUsageSnapshot = { totalSize, totalObjects, perBucket };
  cachedMinioUsage = { ts: Date.now(), data: snapshot };
  return snapshot;
}

export class Controller {
  private fileLogService = Container.get<BaseService<FileLog, any>>('fileLogService');

  public getStorageStats = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const dbStats = await this.fileLogService.baseModel().aggregate({
        _sum: { size: true },
        _count: { id: true },
        where: { deletedAt: null },
      });

      const totalFiles = await this.fileLogService.baseModel().count({
        where: { isFolder: false, deletedAt: null },
      });

      const totalFolders = await this.fileLogService.baseModel().count({
        where: { isFolder: true, deletedAt: null },
      });

      // MinIO host-level capacity / free space is only exposed by the admin
      // API (not by the `minio` SDK), so we report bucket usage instead, which
      // is what actually matters for a managed/remote MinIO. `total` and
      // `used` map onto the "Server Volume" card; `available` is shown as the
      // count of objects on the "Available Space" card (frontend handles the
      // label override).
      const minioUsage = await collectMinioUsage();

      responseSuccess(res, {
        message: 'Success',
        data: {
          database: {
            totalSize: dbStats._sum.size || 0,
            totalItems: dbStats._count.id || 0,
            totalFiles,
            totalFolders,
          },
          server: {
            total: minioUsage.totalSize,
            used: minioUsage.totalSize,
            available: 0,
            percent: minioUsage.totalSize > 0 ? '100%' : '0%',
            objectCount: minioUsage.totalObjects,
            perBucket: minioUsage.perBucket,
          },
        },
      });
    }),
  ];

  // manage file logs
  public fileLogListOrDetails = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const paginationParams = req.query;

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const _id = req.params?.id as string;
        const fileLogs = await this.fileLogService.findById(_id);
        responseSuccess(res, { message: 'Success', data: fileLogs });
      } else {
        const parentId = req.query.parentId as string;
        const category = req.query.category as string; // bucket
        const fileName = req.query.fileName as string;
        const mimeType = req.query.mimeType as string;
        
        const where: any = { deletedAt: null };
        
        if (category && category !== 'all') {
          if (category === 'public') {
            where.isPublic = true;
          } else if (category === 'private') {
            where.isPublic = false;
          } else {
            where.category = category;
          }
        }

        if (fileName) {
          where.fileName = { contains: fileName, mode: 'insensitive' };
        }
        
        // Always respect parentId/bucket navigation
        if (parentId && parentId !== 'root') {
          where.parentId = parentId;
        } else if (parentId === 'root' || !parentId) {
          // Root level of the category/bucket
          where.parentId = null;
        }

        if (mimeType) where.mimeType = mimeType;

        const sortBy = req.query.sort_by as string || 'fileName';
        const orderBy = req.query.order_by as string || 'asc';
        
        const fileLogs = await this.fileLogService.findAll(
          paginationParams, 
          ['fileName'], 
          {}, 
          where,
          [{ isFolder: 'desc' }, { [sortBy]: orderBy }]
        );
        
        responseSuccess(res, { 
          message: 'Success', 
          data: fileLogs?.data, 
          meta: fileLogs?.meta
        });
      }
    }),
  ];

  public fileLogSync = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { category: originalCategory, folder: targetFolder, bucket: requestedBucket } = req.body;
      if (!originalCategory) {
        return responseError(res, 400, { message: "Category (bucket) is required", code: '400' });
      }

      // Map aliases to real bucket names
      let bucket = requestedBucket;

      if (!bucket) {
        bucket = originalCategory === 'public' ? MINIO_PUBLIC_BUCKET : 
                 (originalCategory === 'private' ? MINIO_PRIVATE_BUCKET : null);
      }

      if (!bucket) {
        // Try to find the bucket from existing records for this category
        const sampleRecord = await this.fileLogService.baseModel().findFirst({
          where: { category: originalCategory, deletedAt: null },
          select: { bucket: true }
        });
        bucket = sampleRecord?.bucket || originalCategory;
      }
      
      const category = originalCategory;
      let targetPrefix = targetFolder || '';
      
      // Ensure targetPrefix starts with category if we are syncing a specific folder
      // but not the category root itself.
      if (targetPrefix && !targetPrefix.startsWith(category)) {
        targetPrefix = `${category}/${targetPrefix}`;
      } else if (!targetPrefix) {
        targetPrefix = category;
      }

      console.log(`🔄 Syncing MinIO bucket: ${bucket} (Category: ${category}, Prefix: ${targetPrefix})...`);
      
      try {
        let minioObjects = await MinioService.listFiles(bucket, targetPrefix);
        
        // If no objects found and targetPrefix has common media extension, retry without extension
        // This handles cases where a folder is named "song.mp3" in DB but is just "song" in MinIO
        if (minioObjects.objects.length === 0 && targetPrefix.match(/\.(mp3|mp4|wav|m4a|mkv|avi|mov)$/i)) {
          const strippedPrefix = targetPrefix.replace(/\.(mp3|mp4|wav|m4a|mkv|avi|mov)$/i, '');
          console.log(`⚠️ No objects found for '${targetPrefix}'. Retrying with stripped prefix: '${strippedPrefix}'...`);
          minioObjects = await MinioService.listFiles(bucket, strippedPrefix);
        }
        
        // We need to build a map of folders to ensure they exist in FileLog
        const objectKeys = minioObjects.objects.map(obj => obj.name);
        
        // Process folders first
        const folderPaths = new Set<string>();
        objectKeys.forEach(key => {
          if (!key) return;
          const parts = key.split('/');
          let currentPath = '';
          // All parts except the last one (filename) are folders
          for (let i = 0; i < parts.length - 1; i++) {
            currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
            folderPaths.add(currentPath);
          }
          // If the key itself ends with /, it's a folder
          if (key.endsWith('/')) {
            folderPaths.add(key.replace(/\/$/, ''));
          }
        });

        // Sync folders
        const sortedFolders = Array.from(folderPaths).sort((a, b) => a.split('/').length - b.split('/').length);
        const folderIdMap = new Map<string, string>(); // path -> id

        for (const path of sortedFolders) {
          // If the folder path is exactly the same as the category, it's the root of this bucket view
          // We don't want to show a redundant folder named after the bucket.
          if (path === category) {
            folderIdMap.set(path, null as any);
            continue;
          }

          const parts = path.split('/');
          const rawFolderName = parts[parts.length - 1];
          const folderName = rawFolderName.replace(/\.(mp3|mp4|wav|m4a|mkv|avi|mov)$/i, '');
          const parentPath = parts.slice(0, -1).join('/');
          const parentId = parentPath ? (folderIdMap.get(parentPath) || null) : null;

          // Check if exists
          let folderRecord = await this.fileLogService.baseModel().findFirst({
            where: { 
              category, 
              isFolder: true, 
              deletedAt: null,
              OR: [
                { folder: path },
                { path: path }
              ]
            }
          });

          if (!folderRecord) {
            folderRecord = await this.fileLogService.baseModel().create({
              data: {
                fileName: folderName,
                url: '',
                size: 0,
                type: 'folder',
                mimeType: 'application/x-directory',
                category,
                bucket,
                folder: path,
                isFolder: true,
                parentId,
                path
              }
            });
          }
          folderIdMap.set(path, folderRecord.id);
        }

        // Sync files
        for (const obj of minioObjects.objects) {
          if (!obj.name || obj.name.endsWith('/')) continue;

          const parts = obj.name.split('/');
          const fileName = parts[parts.length - 1];
          const parentPath = parts.slice(0, -1).join('/');
          
          // Try to get parentId from our map first, otherwise look it up in DB
          let parentId = parentPath ? folderIdMap.get(parentPath) : null;
          if (parentPath && parentId === undefined) {
             const parentFolder = await this.fileLogService.baseModel().findFirst({
               where: { folder: parentPath, category, isFolder: true, deletedAt: null }
             });
             parentId = parentFolder?.id || null;
          }

          // Check if exists
          const existing = await this.fileLogService.baseModel().findFirst({
            where: { 
              category, 
              deletedAt: null,
              OR: [
                { url: obj.name },
                { path: obj.name }
              ]
            }
          });

          const isPublic = category === MINIO_PUBLIC_BUCKET || (originalCategory === 'public');

          if (!existing) {
            await this.fileLogService.baseModel().create({
              data: {
                fileName,
                url: obj.name,
                size: Number(obj.size),
                type: fileName.split('.').pop() || 'unknown',
                mimeType: (obj as any).contentType || 'application/octet-stream',
                category,
                bucket: bucket,
                folder: parentPath || null,
                isFolder: false,
                parentId,
                lastModified: obj.lastModified,
                isPublic
              }
            });
          } else {
            // Update size and lastModified if changed
            await this.fileLogService.baseModel().update({
              where: { id: existing.id },
              data: {
                size: Number(obj.size),
                lastModified: obj.lastModified,
                parentId // Update parentId just in case folder structure was missing
              }
            });
          }
        }

        responseSuccess(res, { message: 'Sync completed' });
      } catch (error: any) {
        console.error('❌ Sync failed:', error.message);
        responseError(res, 500, { message: `Sync failed: ${error.message}`, code: '500' });
      }
    }),
  ];


  public fileLogCreateFolder = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { name, parentId, category, isPublic } = req.body;
      if (!name || !category) {
        return responseError(res, 400, { message: "Name and category are required", code: '400' });
      }

      // Strip extensions for clean HLS/Storage folder names
      const folderName = name.replace(/\.(mp3|mp4|wav|m4a|mkv|avi|mov)$/i, '');

      // Determine bucket based on isPublic toggle
      let targetBucket = category;
      if (isPublic === true) {
        targetBucket = MINIO_PUBLIC_BUCKET || category;
      } else if (isPublic === false) {
        targetBucket = MINIO_PRIVATE_BUCKET || category;
      }

      let folderPath = name;
      let parentObj = null;
      if (parentId) {
        parentObj = await this.fileLogService.findById(parentId);
        if (parentObj) {
          folderPath = `${parentObj.folder}/${name}`;
        }
      }

      // Create in MinIO
      await MinioService.createFolder(targetBucket, folderPath);

      const result = await this.fileLogService.baseModel().create({
        data: {
          fileName: folderName,
          url: '',
          size: 0,
          type: 'folder',
          mimeType: 'application/x-directory',
          category,
          bucket: targetBucket,
          folder: folderPath,
          isFolder: true,
          parentId: parentId || null,
          path: folderPath,
          isPublic: !!isPublic
        }
      });

      responseSuccess(res, { message: 'Folder created', data: result });
    }),
  ];

  public fileLogCreateOrUpdate = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;

      const inputData = {
        ...req.body,
      };

      if (recordId && recordId !== 'all') {
        const _id = recordId;

        // Fetch existing record to check if IS_PUBLIC changed
        const existingFile = await this.fileLogService.findById(_id);
        
        if (existingFile && typeof inputData.isPublic === 'boolean' && existingFile.isPublic !== inputData.isPublic) {
          const sourceBucket = existingFile.isPublic ? MINIO_PUBLIC_BUCKET : MINIO_PRIVATE_BUCKET;
          const destBucket = inputData.isPublic ? MINIO_PUBLIC_BUCKET : MINIO_PRIVATE_BUCKET;
          
          if (existingFile.url && sourceBucket && destBucket && sourceBucket !== destBucket) {
            const minioKey = existingFile.url.startsWith('/') ? existingFile.url.substring(1) : existingFile.url;
            try {
              console.log(`🚚 Moving file ${minioKey} from ${sourceBucket} to ${destBucket}...`);
              await MinioService.moveFile(sourceBucket, destBucket, minioKey);
              console.log(`✅ Successfully moved file to ${destBucket}`);
            } catch (error: any) {
               console.error('❌ Failed to move file in MinIO:', error.message);
               return responseError(res, 500, { code: '500', message: 'Failed to move file in storage: ' + error.message });
            }
          }
        }

        await this.fileLogService.update(_id, inputData);
      }

      if (!recordId) {
        const { error, value } = FileLogSchema.validate(req.body, {
          abortEarly: false,
          allowUnknown: false,
        });

        if (error) {
          return responseError(res, 400, { code: '400', message: error.details.map(err => err.message).join(', ') });
        }

        const result = await this.fileLogService.create(inputData);
        if (result instanceof Error) {
          return responseError(res, 400, { code: '400', message: result.message });
        }
      }

      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];

  public fileLogDelete = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const fileId = req.params.id as string;
      const fileLog = await this.fileLogService.baseModel().findUnique({ 
        where: { id: fileId },
        include: { children: true }
      });

      if (!fileLog) {
        return responseError(res, 404, { message: "File not found", code: '404' });
      }

      if (fileLog.isFolder) {
        // Handle folder deletion
        // 1. Delete all children from MinIO and Database recursively
        // For simplicity here, we'll just delete the folder record and assume the user knows it's recursive in the bucket
        const bucket = fileLog.category;
        try {
          await MinioService.removeFolder(bucket, fileLog.folder + '/');
          console.log(`🗑️ Deleted folder from MinIO: ${bucket}/${fileLog.folder}`);
        } catch (error: any) {
          console.error('❌ Failed to delete folder from MinIO:', error.message);
        }
        
        // Soft delete all descendants in DB
        await this.fileLogService.baseModel().updateMany({
          where: { path: { startsWith: fileLog.path + '/' }, category: fileLog.category },
          data: { deletedAt: new Date() }
        });
      } else if (fileLog.url) {
        const key = fileLog.url.startsWith('/') ? fileLog.url.substring(1) : fileLog.url;
        const bucket = fileLog.isPublic ? MINIO_PUBLIC_BUCKET : MINIO_PRIVATE_BUCKET;
        
        if (bucket) {
          try {
            await MinioService.removeFile(bucket, key);
            console.log(`🗑️ Deleted file from MinIO: ${bucket}/${key}`);
          } catch (error: any) {
            console.error('❌ Failed to delete file from MinIO:', error.message);
          }
        }
      }

      await this.fileLogService.delete(fileId);
      responseSuccess(res, { message: 'Success', data: {} });
    }),
  ];

  public fetchFileLogCategoryAndTypes = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      // We intentionally drop the `category != ''` filter so that legacy rows
      // (uploaded before bucket/category were enforced) still contribute to
      // the bucket discovery below.
      const bucketCategories = await this.fileLogService.baseModel().findMany({
        distinct: ['bucket', 'category'],
        select: {
          bucket: true,
          category: true,
        },
        where: { deletedAt: null },
      });

      const types = await this.fileLogService.baseModel().findMany({
        distinct: ['mimeType'],
        select: { mimeType: true },
        where: { deletedAt: null },
      });

      // Always surface the configured MinIO buckets so a fresh install still
      // renders a usable "Storage Buckets" section. Every bucket gets a
      // default `assets` category so users can click in and start uploading
      // immediately, without first running a deep sync.
      const DEFAULT_CATEGORY = 'assets';
      const configuredBuckets: { name: string; isPublic: boolean }[] = [];
      if (MINIO_PRIVATE_BUCKET) {
        configuredBuckets.push({ name: MINIO_PRIVATE_BUCKET, isPublic: false });
      }
      if (MINIO_PUBLIC_BUCKET) {
        configuredBuckets.push({ name: MINIO_PUBLIC_BUCKET, isPublic: true });
      }

      const fallbackBucket =
        configuredBuckets[0]?.name || MINIO_PRIVATE_BUCKET || 'UNASSIGNED';

      const bucketMap: Record<string, Set<string>> = {};
      for (const b of configuredBuckets) {
        bucketMap[b.name] = new Set([DEFAULT_CATEGORY]);
      }

      for (const bc of bucketCategories) {
        const bucketName = bc.bucket || fallbackBucket;
        if (!bucketMap[bucketName]) bucketMap[bucketName] = new Set();
        const category = bc.category && bc.category.length > 0 ? bc.category : DEFAULT_CATEGORY;
        bucketMap[bucketName].add(category);
      }

      const buckets = Object.entries(bucketMap)
        .map(([name, categorySet]) => ({
          name,
          categories: Array.from(categorySet).sort(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const allCategories = _.uniq(
        Object.values(bucketMap).flatMap((set) => Array.from(set)),
      ).sort();

      responseSuccess(res, {
        message: 'Success',
        data: {
          buckets,
          categories: allCategories,
          types: types?.map((v: any) => v.mimeType).filter(Boolean) || [],
        },
      });
    }),
  ];

  public fileLogSyncAll = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      // Respond immediately to the client
      responseSuccess(res, { message: "Deep sync started in the background" });

      const socketService = Container.get(WebSocketService);
      const updateProgress = (progress: number, message: string, status: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        socketService.updateGlobalSyncState({
          data: { progress, message, status }
        });
      };

      // Run sync in background with retry logic
      (async () => {
        const MAX_RETRIES = 5;
        const RETRY_DELAY_MS = 3000;

        const runWithRetry = async (fn: () => Promise<void>, label: string) => {
          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              await fn();
              return;
            } catch (error: any) {
              console.error(`❌ ${label} attempt ${attempt} failed:`, error.message);
              if (attempt === MAX_RETRIES) throw error;
              
              updateProgress(0, `${label} failed, retrying (${attempt}/${MAX_RETRIES})...`, 'warning');
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            }
          }
        };

        try {
          await runWithRetry(async () => {
            updateProgress(0, "Clearing local database...");
            await this.fileLogService.baseModel().deleteMany({});
          }, "Database Clear");

          const buckets = [
            { name: MINIO_PRIVATE_BUCKET, isPublic: false },
            { name: MINIO_PUBLIC_BUCKET, isPublic: true }
          ];

          let totalItemsProcessed = 0;
          let totalObjects = 0;

          await runWithRetry(async () => {
            updateProgress(5, "Counting objects in MinIO...");
            totalObjects = 0;
            for (const b of buckets) {
              const result = await MinioService.listFiles(b.name, '');
              totalObjects += result.objects.length;
            }
          }, "MinIO Counting");

          const syncBucket = async (bucket: string, isPublic: boolean, startProgress: number, endProgress: number) => {
            await runWithRetry(async () => {
              const result = await MinioService.listFiles(bucket, '');
              const { objects } = result;
              
              const folderMap = new Map<string, string>();
              const sortedObjects = _.sortBy(objects, (o) => o.name?.split('/').length);

              for (let idx = 0; idx < sortedObjects.length; idx++) {
                const obj = sortedObjects[idx];
                if (!obj.name) continue;
                
                // Skip .thumb folders
                if (obj.name.includes('/.thumb/') || obj.name.startsWith('.thumb/')) continue;
                
                const pathParts = obj.name.split('/');
                let currentPath = '';

                for (let i = 0; i < pathParts.length; i++) {
                  const part = pathParts[i];
                  if (!part) continue;

                  const isLast = i === pathParts.length - 1;
                  const fullPath = currentPath ? `${currentPath}/${part}` : part;
                  const isFolder = !isLast || obj.name.endsWith('/');
                  const category = pathParts[0];

                  if (!folderMap.has(fullPath)) {
                    // If the folder is exactly the same as the category, it's the root of this bucket view
                    // We don't want to show a redundant folder named after the bucket.
                    if (fullPath === category && isFolder) {
                      folderMap.set(fullPath, null as any);
                    } else {
                      const isCurrentFolder = isFolder;
                      const parentPath = currentPath;
                      const parentId = parentPath ? folderMap.get(parentPath) : undefined;
                      const cleanPart = isCurrentFolder ? part.replace(/\.(mp3|mp4|wav|m4a|mkv|avi|mov)$/i, '') : part;

                      const data: any = {
                        fileName: cleanPart,
                        url: isCurrentFolder ? '' : `${isPublic ? process.env.NEXT_PUBLIC_UPLOAD_URL || '' : ''}/${bucket}/${obj.name}`,
                        type: isCurrentFolder ? 'folder' : (part.split('.').pop() || 'file'),
                        size: isCurrentFolder ? 0 : (obj.size || 0),
                        mimeType: isCurrentFolder ? 'directory' : 'application/octet-stream',
                        category: category,
                        bucket: bucket,
                        isFolder: isCurrentFolder,
                        parentId: parentId,
                        path: isCurrentFolder ? fullPath : obj.name,
                        folder: isCurrentFolder ? fullPath : (parentPath || null),
                        isPublic: isPublic,
                        lastModified: obj.lastModified || new Date()
                      };

                      const created = await this.fileLogService.baseModel().create({ data });
                      folderMap.set(fullPath, created.id);
                    }
                  }
                  currentPath = fullPath;
                }

                totalItemsProcessed++;
                const currentProgress = Math.round(startProgress + ((totalItemsProcessed / totalObjects) * (endProgress - startProgress)));
                if (totalItemsProcessed % 50 === 0) {
                  updateProgress(currentProgress, `Processing ${bucket}/${obj.name}...`);
                }
              }
            }, `Syncing Bucket ${bucket}`);
          };

          await syncBucket(buckets[0].name, false, 10, 50);
          await syncBucket(buckets[1].name, true, 50, 100);

          updateProgress(100, "Deep sync completed successfully", 'success');
          // Clear state after 5 minutes so toast disappears eventually
          setTimeout(() => socketService.updateGlobalSyncState(null), 5 * 60 * 1000);
        } catch (error: any) {
          console.error('❌ Background deep sync failed:', error.message);
          updateProgress(100, `Deep sync failed after retries: ${error.message}`, 'error');
          setTimeout(() => socketService.updateGlobalSyncState(null), 5 * 60 * 1000);
        }
      })();
    }),
  ];

  public fileLogPreview = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const fileId = req.params.id as string;
      const fileLog = await this.fileLogService.baseModel().findUnique({ where: { id: fileId } });

      if (!fileLog) {
        return responseError(res, 404, { message: "File not found", code: '404' });
      }

      const isMediaFolder = fileLog.isFolder && (fileLog.type === 'audio' || fileLog.type === 'video');

      let key = fileLog.url;
      if (isMediaFolder) {
        key = `${fileLog.folder}/playlist.m3u8`;
      }

      const bucket = fileLog.bucket || (fileLog.isPublic ? MINIO_PUBLIC_BUCKET : MINIO_PRIVATE_BUCKET);
      const objectPath = toStorageObjectPath(key, { bucket, isPublic: fileLog.isPublic });

      responseSuccess(res, {
        message: 'Success',
        data: { url: objectPath, bucket: fileLog.bucket || bucket },
      });
    }),
  ];
}
