import { responseError, responseSuccess } from '@/utils/api-response';
import { asyncController } from '@/utils/async-controller';
import { Request, Response } from 'express';
import path from 'path';
import { ConsoleFileUploadToS2, createFileFilter } from '@/middlewares/file-upload.middleware';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { Admin, FileLog } from '@/generated/prisma/client';
import { InvalidPayloadException } from '@/utils/exception';
import Container from 'typedi';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import * as MinioService from '@/features/system/files/minio/service';
import { MINIO_PRIVATE_BUCKET, MINIO_PUBLIC_BUCKET } from '@/config';
import * as Minio from 'minio';
import { logger } from '@/logging/logger';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { mediaProcessingService } from './media-processing.service';
import { WebSocketService } from '@/third-party/bdataSocket';
import { SIO_EVENTS } from '@/third-party/bdataSocket/sioConstants';

export class Controller {
  private fileLogService = Container.get<BaseService<FileLog, any>>('fileLogService');
  private isSyncing = false;

  public streamHlsProxy = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      try {
        const idParam = req.params.id as unknown as string | string[];
        const fileParam = req.params.file as unknown as string | string[];

        const fileId = Array.isArray(idParam) ? idParam[0] : idParam;
        const file = Array.isArray(fileParam) ? fileParam[0] : fileParam;
        
        if (!fileId) {
          return responseError(res, 400, { code: '400', message: 'Invalid file ID' });
        }

        const log = await this.fileLogService.baseModel().findUnique({
          where: { id: fileId }
        });

        if (!log) {
          return responseError(res, 404, { code: '404', message: 'File log not found' });
        }

        const bucket = log.isPublic ? MINIO_PUBLIC_BUCKET : MINIO_PRIVATE_BUCKET;
        // log.url is the directory path for media files, e.g., "/storage/audio/name"
        const folder = log.url.startsWith('/') ? log.url.substring(1) : log.url;
        const key = `${folder}/${file}`;

        try {
          const stream = await MinioService.getObjectStream(bucket, key);
          
          const contentType = this.getStreamContentType(file);
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          
          stream.pipe(res);
        } catch (minioError: any) {
          logger.error(`MinIO stream error for ${key}: ${minioError.message}`);
          res.status(404).end();
        }
      } catch (error: any) {
        logger.error(`HLS proxy error: ${error.message}`);
        res.status(500).end();
      }
    }),
  ];

  private getStreamContentType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.m3u8') return 'application/x-mpegURL';
    if (ext === '.ts') return 'video/MP2T';
    return 'application/octet-stream';
  }

  private profileUpload = ConsoleFileUploadToS2({
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  private assetsUpload = ConsoleFileUploadToS2({
    maxSize: 500 * 1024 * 1024, // 500MB
  });

  // Store for tracking chunk uploads (in production, use Redis or database)
  private chunkUploadSessions = new Map<string, {
    fileName: string;
    fileSize: number;
    mimeType: string;
    category: string;
    isPublic: boolean;
    key: string;
    bucket: string;
    uploadedChunks: Array<{ partNumber: number; etag: string }>;
    createdAt: Date;
    originalFileName: string;
    minioUploadId: string;
    replace: boolean;
  }>();

  public uploadImage = [
    this.profileUpload.single('general'),
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const filePath = req.file.key;
      const fileName = req.file.filename;
      const fileUrl = `${req.protocol}://${req.get('host')}/${filePath}`;
      responseSuccess(res, { message: 'Success', data: { filePath, fileName, fileUrl } });
    }),
  ];

  public uploadAssets = [
    this.assetsUpload.single('assets'),
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {

      if (!req.file) {
        throw new InvalidPayloadException('No file uploaded');
      }

      const filePath = req.file.location;
      const fileName = req.file.filename;
      const category = req.body.category || 'assets';
      const type = req.body.type || 'document';
      const isPublic = req.body.isPublic == "true";

      const rawDirName = path.dirname(req.file.key);
      const dirName = rawDirName.replace(/\.(mp3|wav|mp4|m4a|mkv|avi|mov)$/i, '');
      const dirParts = dirName.split('/');
      const folderPath = dirParts.slice(dirParts[0] === 'storage' || dirParts[0] === 'hls' ? 1 : 0).join('/');

      const isMedia = type === 'audio' || type === 'video';
      const isReplace = req.body.replace === "true" || req.query.replace === "true";
      const parentId = req.body.parentId || req.query.parentId;
      let log;

      if (isMedia) {
        let existingId: number | undefined;
        if (isReplace) {
          const existing = await this.fileLogService.baseModel().findFirst({
            where: { 
              fileName: fileName,
              folder: folderPath || category,
              deletedAt: null
            }
          });
          existingId = existing?.id;
        }

        const trackingId = existingId ? String(existingId) : `job_${uuidv4()}`;

        // Trigger media processing without creating/updating log first
        mediaProcessingService.processMedia({
          id: existingId,
          trackingId: trackingId,
          fileName: fileName,
          url: req.file.key,
          originalName: req.file.originalname,
          size: req.file.size,
          type: type,
          mimetype: req.file.mimetype,
          category: category,
          isPublic: isPublic,
          folder: folderPath || category,
          parentId: parentId || undefined,
          bucket: isPublic ? MINIO_PUBLIC_BUCKET : MINIO_PRIVATE_BUCKET,
        }, req.user?.id).catch(err => {
          logger.error(`Media processing triggered error: ${err.message}`);
        });

        return responseSuccess(res, {
          message: 'File uploaded, HLS processing started',
          data: { 
            processing: true,
            trackingId: trackingId,
            filePath, 
            fileName, 
            folder: category,
            url: req.file.key,
          }
        });
      }

      if (isReplace) {
        const existing = await this.fileLogService.baseModel().findFirst({
          where: { 
            fileName: fileName,
            folder: folderPath || category,
            deletedAt: null
          }
        });

        if (existing) {
          log = await this.fileLogService.baseModel().update({
            where: { id: existing.id },
            data: {
              url: req.file.key,
              originalName: req.file.originalname,
              size: req.file.size,
              type: type,
              mimeType: req.file.mimetype,
              updatedAt: new Date(),
            }
          });
        }
      }

      if (!log) {
        log = await this.fileLogService.baseModel().create({
          data: {
            fileName: fileName,
            url: req.file.key,
            originalName: req.file.originalname,
            size: req.file.size,
            type: type,
            mimeType: req.file.mimetype,
            category: category,
            bucket: isPublic ? MINIO_PUBLIC_BUCKET : MINIO_PRIVATE_BUCKET,
            folder: folderPath || category,
            parentId: parentId || undefined,
            authorId: 'system',
            isPublic: isPublic,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        });
      }

      responseSuccess(res, {
        message: 'File uploaded successfully',
        data: { 
          filePath, 
          fileName, 
          log,
          folder: category,
          url: req.file.key,
        }
      });
    }),
  ];

  public listCategories = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      // The user wants to see Public and Private buckets as the main categories
      const categories = ['public', 'private'];
      
      responseSuccess(res, {
        message: 'Success',
        data: { categories },
      });
    }),
  ];

  public createCategory = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { categoryName } = req.body;
      
      if (!categoryName) {
        return responseError(res, 400, { code: '400', message: 'Category name is required' });
      }

      const bucket = MINIO_PRIVATE_BUCKET;
      const folderName = `storage/${categoryName}`;
      
      await MinioService.createFolder(bucket, folderName);
      
      responseSuccess(res, {
        message: 'Category folder created successfully',
        data: { category: categoryName },
      });
    }),
  ];

  public deleteCategory = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { categoryName } = req.body;

      if (!categoryName) {
        return responseError(res, 400, { code: '400', message: 'Category name is required' });
      }

      const bucket = MINIO_PRIVATE_BUCKET;
      const folderName = `storage/${categoryName}`;

      await MinioService.removeFolder(bucket, folderName);

      responseSuccess(res, {
        message: 'Category folder deleted successfully',
        data: { category: categoryName },
      });
    }),
  ];

  /**
   * Initialize chunk upload session
   */
  public initChunkUpload = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { fileName, fileSize, mimeType, category, isPublic, type, replace } = req.body;

      console.log('CHUNK INIT REQUEST:', { fileName, fileSize, mimeType, category, isPublic, type });

      if (!fileName || !fileSize || !mimeType || !category) {
        throw new InvalidPayloadException('Missing required parameters: fileName, fileSize, mimeType, category');
      }

      // Apply file filter to validate the file type
      const fileFilter = createFileFilter();
      const mockFile: Express.Multer.File = {
        fieldname: 'chunk',
        originalname: fileName,
        encoding: '7bit',
        mimetype: mimeType,
        size: fileSize,
        buffer: Buffer.alloc(0),
        stream: undefined as any,
        destination: '',
        filename: fileName,
        path: '',
      };

      // Validate file type (this will throw if invalid)
      await new Promise<void>((resolve, reject) => {
        fileFilter(req, mockFile, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Generate unique upload ID and file key
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const sanitizedName = fileName.toLowerCase().replace(/[^a-z0-9.]/g, '_');
      const isReplace = replace === 'true' || replace === true;
      let processedFileName = isReplace ? sanitizedName : `${Date.now()}_${sanitizedName}`;
      
      let finalMimeType = mimeType;
      const folderParam = (req.body.folder ?? req.query.folder) as unknown as string | string[] | undefined;
      const folder = Array.isArray(folderParam) ? folderParam[0] : folderParam;

      // Handle image processing (convert to WebP)
      if (type === 'image' || mimeType.startsWith('image/')) {
        processedFileName = processedFileName.replace(/\.[^.]+$/, '.webp');
        finalMimeType = 'image/webp';
      }

      let key = category ? `${category}/${folder ? folder + '/' : ''}${processedFileName}` : processedFileName;
      if (type === 'audio' || type === 'video') {
        const folderName = processedFileName.replace(/\.(mp3|wav|mp4|m4a|mkv|avi|mov)$/i, '');
        const extension = path.extname(processedFileName) || (type === 'audio' ? '.mp3' : '.mp4');
        key = `${category}/${folder ? folder + '/' : ''}${folderName}/input${extension}`;
      }
      const bucket = isPublic === 'true' || isPublic === true ? MINIO_PUBLIC_BUCKET : MINIO_PRIVATE_BUCKET;
      
      console.log('🪣 BUCKET DEBUG:', {
        isPublic,
        isPublicType: typeof isPublic,
        MINIO_PRIVATE_BUCKET,
        MINIO_PUBLIC_BUCKET,
        selectedBucket: bucket
      });

      if (!bucket) {
        console.error('❌ BUCKET NAME IS UNDEFINED!');
        throw new InvalidPayloadException('Bucket configuration is missing. Please check environment variables.');
      }

      // Initialize multipart upload in MinIO
      const initResult = await MinioService.initMultipartUpload(bucket, key, finalMimeType);

      // Store session info
      this.chunkUploadSessions.set(uploadId, {
        fileName: processedFileName,
        originalFileName: fileName,
        fileSize,
        mimeType: finalMimeType,
        category,
        isPublic: isPublic === 'true' || isPublic === true,
        key,
        bucket,
        uploadedChunks: [],
        createdAt: new Date(),
        minioUploadId: initResult.uploadId,
        replace: isReplace,
      });

      console.log('✓ CHUNK INIT SUCCESS:', {
        uploadId,
        sessionCount: this.chunkUploadSessions.size,
        fileName: processedFileName,
        bucket,
        key
      });

      // Clean up old sessions (older than 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      for (const [sessionId, session] of this.chunkUploadSessions.entries()) {
        if (session.createdAt < oneHourAgo) {
          // Abort the multipart upload
          await MinioService.abortMultipartUpload(session.bucket, session.key, session.minioUploadId);
          this.chunkUploadSessions.delete(sessionId);
        }
      }

      responseSuccess(res, {
        message: 'Chunk upload initialized',
        data: {
          uploadId,
          key,
          bucket,
        },
      });
    }),
  ];

  /**
   * Upload a single chunk
   */
  public uploadChunk = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { uploadId, chunkIndex, totalChunks } = req.body;
      const chunk = req.file;

      console.log('📦 CHUNK UPLOAD REQUEST:', { 
        uploadId, 
        chunkIndex, 
        totalChunks,
        hasChunk: !!chunk,
        chunkSize: chunk?.size || 0,
        bodyKeys: Object.keys(req.body),
        sessionCount: this.chunkUploadSessions.size 
      });

      if (!uploadId) {
        console.error('❌ Missing uploadId in request');
        throw new InvalidPayloadException('Missing uploadId');
      }

      if (chunkIndex === undefined) {
        console.error('❌ Missing chunkIndex in request');
        throw new InvalidPayloadException('Missing chunkIndex');
      }

      if (!chunk) {
        console.error('❌ No chunk file provided');
        throw new InvalidPayloadException('No chunk file provided');
      }

      const session = this.chunkUploadSessions.get(uploadId);
      console.log('🔍 SESSION LOOKUP:', { 
        found: !!session, 
        uploadId,
        availableSessions: Array.from(this.chunkUploadSessions.keys())
      });
      
      if (!session) {
        console.error('❌ Session not found or expired. Available sessions:', Array.from(this.chunkUploadSessions.keys()));
        throw new InvalidPayloadException('Invalid or expired upload session. Please restart the upload.');
      }

      // Upload chunk to MinIO
      const chunkIndexNum = parseInt(chunkIndex, 10);
      console.log('⬆️ UPLOADING CHUNK:', { 
        bucket: session.bucket, 
        key: session.key, 
        partNumber: chunkIndexNum + 1,
        chunkSize: chunk.buffer.length
      });
      
      try {
        const uploadResult = await MinioService.uploadChunk(
          session.bucket,
          session.key,
          session.minioUploadId,
          chunkIndexNum,
          chunk.buffer
        );

        // Store the ETag for later completion
        session.uploadedChunks.push({
          partNumber: chunkIndexNum + 1, // MinIO uses 1-based part numbers
          etag: uploadResult.etag || '',
        });

        console.log('✓ CHUNK UPLOADED:', { 
          chunkIndex: chunkIndexNum, 
          totalUploaded: session.uploadedChunks.length,
          etag: uploadResult.etag?.substring(0, 20) + '...'
        });
      } catch (error: any) {
        console.error('❌ CHUNK UPLOAD FAILED:', {
          chunkIndex: chunkIndexNum,
          error: error.message,
          bucket: session.bucket,
          key: session.key
        });
        throw error;
      }

      responseSuccess(res, {
        message: 'Chunk uploaded successfully',
        data: {
          success: true,
          chunkIndex: chunkIndexNum,
          uploadedChunks: session.uploadedChunks.length,
        },
      });
    }),
  ];

  /**
   * Complete chunk upload and merge all parts
   */
  public completeChunkUpload = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { uploadId, fileName, category, fileType, isPublic } = req.body;

      console.log('🏁 CHUNK COMPLETE REQUEST:', { 
        uploadId, 
        fileName, 
        category, 
        fileType, 
        isPublic,
        sessionCount: this.chunkUploadSessions.size 
      });

      if (!uploadId) {
        console.error('❌ Missing uploadId in complete request');
        throw new InvalidPayloadException('Missing uploadId');
      }

      const session = this.chunkUploadSessions.get(uploadId);
      console.log('🔍 SESSION LOOKUP:', { 
        found: !!session, 
        uploadId,
        availableSessions: Array.from(this.chunkUploadSessions.keys())
      });
      
      if (!session) {
        console.error('❌ Session not found or expired. Available sessions:', Array.from(this.chunkUploadSessions.keys()));
        throw new InvalidPayloadException('Invalid or expired upload session. Please restart the upload.');
      }

      // Sort chunks by part number
      session.uploadedChunks.sort((a, b) => a.partNumber - b.partNumber);

      console.log('🔄 MERGING CHUNKS:', { 
        totalChunks: session.uploadedChunks.length,
        bucket: session.bucket,
        key: session.key 
      });

      if (session.uploadedChunks.length === 0) {
        throw new InvalidPayloadException('No chunks have been uploaded successfully. Cannot complete upload.');
      }

      // Complete the multipart upload
      const completeResult = await MinioService.completeMultipartUpload(
        session.bucket,
        session.key,
        session.minioUploadId,
        session.uploadedChunks
      );

      console.log('✓ MERGE COMPLETE:', { 
        url: completeResult.url,
        key: session.key 
      });

      const logType = fileType || session.mimeType.split('/')[0] || 'unknown';
      const isMedia = logType === 'audio' || logType === 'video';
      
      // For media processing, we need the path to the ACTUAL uploaded file
      const sourceFileUrl = `/${session.key}`;
      // After processing, the file log will point to the HLS folder
      const hlsFolderUrl = isMedia ? `/${path.dirname(session.key)}` : `/${session.key}`;

      const rawDirName = path.dirname(session.key);
      const dirName = rawDirName.replace(/\.(mp3|wav|mp4|m4a|mkv|avi|mov)$/i, '');
      const dirParts = dirName.split('/');
      const folderPath = dirParts.slice(dirParts[0] === 'storage' || dirParts[0] === 'hls' ? 1 : 0).join('/');
      const logFileName = fileName || session.fileName;
      const parentId = req.body.parentId || req.query.parentId;

      if (isMedia) {
        let existingId: number | undefined;
        if (session.replace) {
          const existing = await this.fileLogService.baseModel().findFirst({
            where: { 
              fileName: logFileName,
              folder: folderPath || category || session.category,
              deletedAt: null
            }
          });
          existingId = existing?.id;
        }

        const trackingId = existingId ? String(existingId) : `job_${uuidv4()}`;

        mediaProcessingService.processMedia({
          id: existingId,
          trackingId: trackingId,
          fileName: logFileName,
          url: hlsFolderUrl, // Pass the folder path here!
          originalName: session.originalFileName || session.fileName,
          size: session.fileSize,
          type: logType,
          mimeType: session.mimeType,
          category: category || session.category,
          isPublic: isPublic ?? session.isPublic,
          folder: folderPath || category || session.category,
          parentId: parentId || undefined,
          bucket: session.bucket,
        }, (req as any).user?.id).catch(err => {
          logger.error(`Media processing triggered error: ${err.message}`);
        });

        // Remove session from memory
        this.chunkUploadSessions.delete(uploadId);

        return responseSuccess(res, {
          message: 'Chunk upload completed, HLS processing started',
          data: {
            processing: true,
            trackingId: trackingId,
            success: true,
            url: hlsFolderUrl,
            key: session.key,
            sourceUrl: sourceFileUrl,
          },
        });
      }

      // Create file log entry for non-media files
      let log;
      if (session.replace) {
        const existing = await this.fileLogService.baseModel().findFirst({
          where: { 
            fileName: logFileName,
            folder: folderPath || category || session.category,
            deletedAt: null
          }
        });

        if (existing) {
          log = await this.fileLogService.baseModel().update({
            where: { id: existing.id },
            data: {
              url: hlsFolderUrl,
              originalName: session.originalFileName || session.fileName,
              size: session.fileSize,
              type: logType,
              mimeType: session.mimeType,
              updatedAt: new Date(),
            }
          });
        }
      }

      if (!log) {
        log = await this.fileLogService.baseModel().create({
          data: {
            fileName: logFileName,
            url: hlsFolderUrl,
            originalName: session.originalFileName || session.fileName,
            size: session.fileSize,
            type: logType,
            mimeType: session.mimeType,
            category: category || session.category,
            bucket: session.bucket,
            folder: folderPath || category || session.category,
            parentId: parentId || undefined,
            authorId: 'system',
            isPublic: isPublic ?? session.isPublic,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        });
      }

      // Remove session from memory
      this.chunkUploadSessions.delete(uploadId);

      responseSuccess(res, {
        message: 'Chunk upload completed successfully',
        data: {
          success: true,
          url: completeResult.url,
          key: session.key,
          log,
        },
      });
    }),
  ];

  public cancelProcessing = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { fileId } = req.body;
      if (!fileId) throw new InvalidPayloadException('Missing fileId');
      
      const cancelled = await mediaProcessingService.cancelProcessing(Number(fileId), req.user?.id);
      
      responseSuccess(res, {
        message: cancelled ? 'Processing cancelled' : 'No active process found for this file',
        data: { cancelled }
      });
    }),
  ];

  public retryProcessing = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { fileId } = req.body;
      if (!fileId) throw new InvalidPayloadException('Missing fileId');

      await mediaProcessingService.retryProcessing(Number(fileId), req.user?.id);

      responseSuccess(res, {
        message: 'Processing retry initiated',
        data: { success: true }
      });
    }),
  ];

  public syncFilesFromStorage = [
    asyncController(async (req: Request, res: Response): Promise<void> => {
      const { bucket } = req.body;
      
      if (this.isSyncing) {
        return responseError(res, 400, { code: 'SYNC_IN_PROGRESS', message: 'Sync is already in progress' });
      }

      // Start sync in background
      this.runSyncInBackground(bucket);

      responseSuccess(res, {
        message: bucket ? `Sync for ${bucket} started in background` : 'Sync started in background',
        data: { success: true }
      });
    }),
  ];

  private async runSyncInBackground(targetBucketName?: string) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    
    const socketService = WebSocketService.getInstance();
    const sendProgress = (message: string, progress: number, status: 'success' | 'info' | 'warning' | 'error' = 'info') => {
      socketService.broadcast(SIO_EVENTS.SYNC_PROGRESS, {
        message,
        progress: Math.round(progress),
        status,
        timestamp: new Date()
      });
      if (status === 'error') logger.error(`[Sync] ${message}`);
      else logger.info(`[Sync] ${message}`);
    };

    try {
      sendProgress('Initializing sync...', 0);
      const publicBucket = MINIO_PUBLIC_BUCKET;
      const privateBucket = MINIO_PRIVATE_BUCKET;
      
      let syncCount = 0;
      let newCount = 0;

      // Clear existing file logs for the targeted bucket or all if no bucket specified
      sendProgress('Cleaning up records...', 5);
      if (targetBucketName) {
        const isPublic = targetBucketName === publicBucket;
        await this.fileLogService.baseModel().deleteMany({
          where: { isPublic }
        });
      } else {
        await this.fileLogService.baseModel().deleteMany({});
      }

      const buckets = [];
      if (targetBucketName) {
        buckets.push({ name: targetBucketName, isPublic: targetBucketName === publicBucket });
      } else {
        if (publicBucket) buckets.push({ name: publicBucket, isPublic: true });
        if (privateBucket) buckets.push({ name: privateBucket, isPublic: false });
      }

      let bucketIndex = 0;
      for (const bucket of buckets) {
        if (!bucket.name) {
          bucketIndex++;
          continue;
        }

        const bucketProgressStart = 10 + (bucketIndex * 45); 
        sendProgress(`Scanning bucket: ${bucket.name}...`, bucketProgressStart);

        // List all objects recursively from the root of the bucket with retry logic
        let result;
        let retries = 3;
        while (retries > 0) {
          try {
            result = await MinioService.listFiles(bucket.name, '');
            break;
          } catch (err: any) {
            retries--;
            sendProgress(`Retry scan for ${bucket.name}...`, bucketProgressStart, 'warning');
            if (retries === 0) throw err;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
          }
        }
        
        const objects = result.objects;
        sendProgress(`Processing ${objects.length} objects in ${bucket.name}...`, bucketProgressStart + 5);

        // Group by folder for media detection
        const mediaFolders = new Set<string>();
        const mediaFolderSizes = new Map<string, number>();
        const standaloneFiles = new Map<string, { size: number; obj: Minio.BucketItem }>();

        for (const obj of objects) {
          const objKey = obj.name;
          if (!objKey) continue;
          if (objKey.includes('/.thumb/') || objKey.startsWith('.thumb/')) continue;
          
          const parts = objKey.split('/');
          
          if (parts.length >= 2) {
            // Check for media indicators (input files or HLS files)
            const isHls = objKey.endsWith('.m3u8') || objKey.endsWith('.ts');
            const isInput = objKey.includes('/input.');
            
            if (isHls || isInput) {
              // Identify the folder containing these files as the media folder
              const folderPath = path.dirname(objKey);
              mediaFolders.add(folderPath);
              if (isInput) {
                mediaFolderSizes.set(folderPath, obj.size); // Use input file size for the folder
              }
            } else {
              // Check if it's already part of a media folder
              let isMediaPart = false;
              for (const mFolder of mediaFolders) {
                if (objKey.startsWith(mFolder + '/')) {
                  isMediaPart = true;
                  break;
                }
              }
              if (!isMediaPart) {
                standaloneFiles.set(objKey, { size: obj.size, obj });
              }
            }
          } else {
            // Root level file
            standaloneFiles.set(objKey, { size: obj.size, obj });
          }
        }

        // Process Media Folders
        let processedFolders = 0;
        for (const folder of mediaFolders) {
          const parts = folder.split('/');
          const category = parts[0] === 'storage' || parts[0] === 'hls' ? (parts[1] || 'assets') : parts[0];
          const type = this.getTypeFromCategory(category, path.basename(folder)); // Pass folder name as hint
          const folderPath = parts.slice(parts[0] === 'storage' || parts[0] === 'hls' ? 1 : 0).join('/');

          await this.fileLogService.baseModel().create({
            data: {
              fileName: path.basename(folder),
              url: `/${folder}`,
              originalName: path.basename(folder),
              size: mediaFolderSizes.get(folder) || 0,
              type: type,
              mimeType: this.getMimeFromCategory(category, path.basename(folder)),
              category: category,
              bucket: bucket.name,
              folder: folderPath,
              authorId: 'system',
              isPublic: bucket.isPublic,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          });
          newCount++;
          syncCount++;
          processedFolders++;
          if (processedFolders % 20 === 0) {
            sendProgress(`Processed ${processedFolders} media folders in ${bucket.name}...`, bucketProgressStart + 10);
          }
        }

        // Process Standalone Files
        let processedFiles = 0;
        for (const [fileKey, fileData] of standaloneFiles) {
          // Final check: is this file within one of the identified media folders?
          let inMediaFolder = false;
          for (const mFolder of mediaFolders) {
            if (fileKey.startsWith(mFolder + '/')) {
              inMediaFolder = true;
              break;
            }
          }
          if (inMediaFolder) continue;

          const parts = fileKey.split('/');
          const category = parts.length > 1 ? (parts[0] === 'storage' ? (parts[1] || 'assets') : parts[0]) : 'assets';
          
          // Extract folder path (dir name relative to bucket, excluding storage/ prefix)
          const dirName = path.dirname(fileKey);
          const dirParts = dirName.split('/');
          const folderPath = dirParts.slice(dirParts[0] === 'storage' || dirParts[0] === 'hls' ? 1 : 0).join('/');

          await this.fileLogService.baseModel().create({
            data: {
              fileName: path.basename(fileKey),
              url: `/${fileKey}`,
              originalName: path.basename(fileKey),
              size: fileData.size,
              type: this.getTypeFromCategory(category, path.basename(fileKey)),
              mimeType: this.getMimeFromCategory(category, path.basename(fileKey)),
              category: category,
              bucket: bucket.name,
              folder: folderPath || category,
              authorId: 'system',
              isPublic: bucket.isPublic,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          });
          newCount++;
          syncCount++;
          processedFiles++;
          if (processedFiles % 100 === 0) {
            const fileProgress = Math.min(25, (processedFiles / standaloneFiles.size) * 25);
            sendProgress(`Processed ${processedFiles} files in ${bucket.name}...`, bucketProgressStart + 20 + fileProgress);
          }
        }
        bucketIndex++;
      }

      sendProgress(`Sync successfully completed! Found ${syncCount} items (${newCount} new).`, 100, 'success');
    } catch (error: any) {
      sendProgress(`Sync process failed: ${error.message}`, 100, 'error');
    } finally {
      this.isSyncing = false;
    }
  }

  private getTypeFromCategory(category: string, filename?: string): string {
    if (filename) {
      const ext = path.extname(filename).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'].includes(ext)) return 'image';
      if (['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m3u8', '.ts', '.flv'].includes(ext)) return 'video';
      if (['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'].includes(ext)) return 'audio';
    }
    
    const cat = category.toLowerCase();
    if (['audio', 'music'].includes(cat)) return 'audio';
    if (['video', 'movies', 'hls'].includes(cat)) return 'video';
    if (['images', 'photos', 'profiles', 'mv_cover', 'album_cover', 'thumbnails', 'covers', 'screenshot', 'artwork'].includes(cat)) return 'image';
    return 'document';
  }

  private getMimeFromCategory(category: string, filename?: string): string {
    if (filename) {
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.webp') return 'image/webp';
      if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
      if (ext === '.png') return 'image/png';
      if (ext === '.gif') return 'image/gif';
      if (ext === '.mp4') return 'video/mp4';
      if (ext === '.mp3') return 'audio/mpeg';
      if (ext === '.m3u8') return 'application/x-mpegURL';
      if (ext === '.ts') return 'video/MP2T';
    }

    const cat = category.toLowerCase();
    if (['audio', 'music'].includes(cat)) return 'audio/mpeg';
    if (['video', 'movies'].includes(cat)) return 'video/mp4';
    if (['images', 'photos', 'profiles', 'mv_cover', 'album_cover', 'thumbnails', 'covers', 'screenshot', 'artwork'].includes(cat)) return 'image/webp';
    return 'application/octet-stream';
  }
}
