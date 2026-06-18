import { logger } from '@/logging/logger';
import * as Minio from 'minio';
import fs from 'fs';
import path from 'path';
import {
  isLocalStorage,
  resolvePublicFileUrl,
  storageConfig,
  STORAGE_ENABLED,
} from '@/config/features/storage';
import * as Local from '@/features/system/files/storage/local';

let _minioClient: Minio.Client | null = null;

function getMinioClient(): Minio.Client {
  if (isLocalStorage()) throw new Error('Remote object storage is not enabled');
  if (_minioClient) return _minioClient;

  _minioClient = new Minio.Client({
    endPoint: storageConfig.endPoint,
    port: storageConfig.port,
    useSSL: storageConfig.useSSL,
    accessKey: storageConfig.accessKey,
    secretKey: storageConfig.secretKey,
    region: storageConfig.region || 'auto',
    pathStyle: storageConfig.pathStyle,
  } as Minio.ClientOptions);

  return _minioClient;
}

/**
 * Backward-compatible export: some modules import `minioClient` directly.
 */
export const minioClient = new Proxy({} as Minio.Client, {
  get(_target, prop) {
    if (isLocalStorage()) {
      return localMinioAdapter[prop as keyof typeof localMinioAdapter];
    }
    const client = getMinioClient() as any;
    return client[prop];
  },
});

const localMinioAdapter = {
  async statObject(bucket: string, key: string) {
    return Local.localStatObject(bucket, key);
  },
  async getObject(bucket: string, key: string) {
    return Local.localGetObject(bucket, key);
  },
  async getPartialObject(bucket: string, key: string, offset: number, length: number) {
    return Local.localGetPartialObject(bucket, key, offset, length);
  },
};

export async function testStorageConnection(): Promise<void> {
  if (isLocalStorage()) {
    Local.ensureLocalStorageRoot();
    logger.info(`Local storage ready at ${storageConfig.localDir}`);
    return;
  }

  try {
    const bucket = storageConfig.privateBucket;
    await getMinioClient().bucketExists(bucket);
    logger.info(`Object storage (${storageConfig.provider}) connection successful`);
  } catch (error: any) {
    logger.error(`Object storage connection failed: ${error.message}`);
  }
}

/** @deprecated use testStorageConnection */
export const testMinioConnection = testStorageConnection;

export interface UploadResult {
  key: string;
  url: string;
  success: boolean;
  bucket: string;
}

export interface RemoveResult {
  deleted: boolean;
  key: string;
}

export interface ListResult {
  objects: Minio.BucketItem[];
  prefixes: string[];
}

export interface CreateFolderResult {
  success: boolean;
  folderName: string;
}

export async function ensureBucketExists(bucket: string): Promise<void> {
  if (isLocalStorage()) {
    await Local.localEnsureBucketExists(bucket);
    return;
  }

  const exists = await getMinioClient().bucketExists(bucket);
  if (!exists) {
    await getMinioClient().makeBucket(bucket, storageConfig.region || 'us-east-1');
    logger.info(`Bucket ${bucket} created`);
  }
}

export async function uploadFile(
  bucket: string,
  folder: string,
  fileName: string,
  buffer: Buffer,
  contentType: string,
): Promise<UploadResult> {
  const key = folder ? `${folder}/${fileName}` : fileName;

  if (isLocalStorage()) {
    await Local.localEnsureBucketExists(bucket);
    await Local.localPutObject(bucket, key, buffer, contentType);
  } else {
    await getMinioClient().putObject(bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  }

  const url = resolvePublicFileUrl(bucket, key);
  logger.info(`File uploaded: ${bucket}/${key}`);

  return { key, url, success: true, bucket };
}

export async function uploadSingleFile(
  bucket: string,
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<UploadResult> {
  const parts = key.split('/');
  const fileName = parts.pop() || '';
  const folder = parts.join('/');
  return uploadFile(bucket, folder, fileName, buffer, contentType);
}

export async function uploadBuffer(
  bucket: string,
  folder: string,
  fileName: string,
  buffer: Buffer,
  contentType: string,
): Promise<UploadResult> {
  return uploadFile(bucket, folder, fileName, buffer, contentType);
}

export async function removeFile(bucket: string, key: string): Promise<RemoveResult> {
  if (isLocalStorage()) {
    await Local.localRemoveObject(bucket, key);
  } else {
    await getMinioClient().removeObject(bucket, key);
  }
  logger.info(`File removed: ${bucket}/${key}`);
  return { deleted: true, key };
}

export async function listFiles(bucket: string, prefix = ''): Promise<ListResult> {
  if (isLocalStorage()) {
    const objects = await Local.localListObjects(bucket, prefix);
    return {
      objects: objects.map((obj) => ({ name: obj.name, size: obj.size } as Minio.BucketItem)),
      prefixes: [],
    };
  }

  const objects: Minio.BucketItem[] = [];
  const prefixes: string[] = [];
  const stream = getMinioClient().listObjects(bucket, prefix, true);

  return new Promise((resolve, reject) => {
    stream.on('data', (obj) => {
      if (obj.prefix) prefixes.push(obj.prefix);
      else if (obj.name) objects.push(obj as Minio.BucketItem);
    });
    stream.on('error', reject);
    stream.on('end', () => resolve({ objects, prefixes }));
  });
}

export async function listFolders(bucket: string, prefix = ''): Promise<string[]> {
  const result = await listFiles(bucket, prefix);
  const folders = new Set<string>();
  result.objects.forEach((obj) => {
    if (!obj.name) return;
    const parts = obj.name.replace(prefix, '').split('/');
    if (parts.length > 1) folders.add(parts[0]);
  });
  return Array.from(folders);
}

export async function createFolder(bucket: string, folderName: string): Promise<CreateFolderResult> {
  const folderKey = folderName.endsWith('/') ? folderName : `${folderName}/`;
  await ensureBucketExists(bucket);

  if (isLocalStorage()) {
    const dir = path.join(storageConfig.localDir, bucket, folderKey);
    await fs.promises.mkdir(dir, { recursive: true });
  } else {
    await getMinioClient().putObject(bucket, folderKey, Buffer.from(''), 0, {
      'Content-Type': 'application/x-directory',
    });
  }

  logger.info(`Folder created: ${bucket}/${folderKey}`);
  return { success: true, folderName: folderKey };
}

export async function removeFolder(bucket: string, folderPrefix: string): Promise<RemoveResult> {
  const files = await listFiles(bucket, folderPrefix);
  for (const obj of files.objects) {
    if (obj.name) await removeFile(bucket, obj.name);
  }
  logger.info(`Folder removed: ${bucket}/${folderPrefix}`);
  return { deleted: true, key: folderPrefix };
}

export async function moveFile(sourceBucket: string, destBucket: string, key: string): Promise<boolean> {
  try {
    if (isLocalStorage()) {
      await Local.localMoveObject(sourceBucket, key, destBucket, key);
    } else {
      const copyConditions = new Minio.CopyConditions();
      await getMinioClient().copyObject(destBucket, key, `/${sourceBucket}/${key}`, copyConditions);
      await getMinioClient().removeObject(sourceBucket, key);
    }
    logger.info(`File moved from ${sourceBucket}/${key} to ${destBucket}/${key}`);
    return true;
  } catch (err: any) {
    logger.error(`Error moving file: ${err.message}`);
    throw err;
  }
}

export async function getObjectStream(bucket: string, key: string): Promise<any> {
  if (isLocalStorage()) return Local.localGetObject(bucket, key);
  return getMinioClient().getObject(bucket, key);
}

export async function getFileUrl(bucket: string, key: string): Promise<string> {
  return resolvePublicFileUrl(bucket, key);
}

export async function getPresignedUrl(bucket: string, key: string, expiry = 3600): Promise<string> {
  if (isLocalStorage()) return resolvePublicFileUrl(bucket, key);
  try {
    return await getMinioClient().presignedGetObject(bucket, key, expiry);
  } catch (err: any) {
    logger.error(`Error generating presigned URL: ${err.message}`);
    throw err;
  }
}

export async function copyFile(bucket: string, sourceKey: string, destKey: string): Promise<UploadResult> {
  if (isLocalStorage()) {
    await Local.localCopyObject(bucket, sourceKey, bucket, destKey);
  } else {
    await getMinioClient().copyObject(bucket, destKey, `${bucket}/${sourceKey}`);
  }
  const url = await getFileUrl(bucket, destKey);
  return { key: destKey, url, success: true, bucket };
}

export function generateFileKey(folder: string, fileName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitizedFileName = fileName.toLowerCase().replace(/[^a-z0-9.]/g, '_');
  return folder ? `${folder}/${timestamp}-${random}-${sanitizedFileName}` : `${timestamp}-${random}-${sanitizedFileName}`;
}

export interface ChunkUploadInitResult {
  uploadId: string;
  key: string;
  bucket: string;
}

export interface ChunkUploadResult {
  success: boolean;
  chunkIndex: number;
  etag?: string;
}

export interface ChunkUploadCompleteResult {
  success: boolean;
  key: string;
  url: string;
  bucket: string;
}

export async function initMultipartUpload(
  bucket: string,
  key: string,
  contentType: string,
): Promise<ChunkUploadInitResult> {
  if (!bucket) throw new Error('Bucket name is required');
  await ensureBucketExists(bucket);

  if (isLocalStorage()) {
    const uploadId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await Local.localInitMultipartUpload(uploadId);
    return { uploadId, key, bucket };
  }

  const uploadId = await getMinioClient().initiateNewMultipartUpload(bucket, key, {
    'Content-Type': contentType,
  });
  logger.info(`Multipart upload initialized: ${bucket}/${key}, uploadId: ${uploadId}`);
  return { uploadId, key, bucket };
}

export async function uploadChunk(
  bucket: string,
  key: string,
  uploadId: string,
  chunkIndex: number,
  chunkBuffer: Buffer,
): Promise<ChunkUploadResult> {
  const partNumber = chunkIndex + 1;

  if (isLocalStorage()) {
    const etag = await Local.localUploadPart(uploadId, partNumber, chunkBuffer);
    return { success: true, chunkIndex, etag };
  }

  const res = await (getMinioClient() as any).makeRequestAsync(
    {
      method: 'PUT',
      bucketName: bucket,
      objectName: key,
      query: `uploadId=${uploadId}&partNumber=${partNumber}`,
      headers: { 'Content-Length': chunkBuffer.length.toString() },
    },
    chunkBuffer,
    [200],
  );

  res.resume();
  await new Promise((resolve) => res.on('end', resolve));

  const rawEtag = res.headers.etag as string | undefined;
  const etag = rawEtag ? rawEtag.replace(/^"/g, '').replace(/"$/g, '') : undefined;
  logger.info(`Chunk uploaded: ${bucket}/${key}, part: ${partNumber}, uploadId: ${uploadId}`);

  return { success: true, chunkIndex, etag };
}

export async function completeMultipartUpload(
  bucket: string,
  key: string,
  uploadId: string,
  parts: Array<{ partNumber: number; etag: string }>,
): Promise<ChunkUploadCompleteResult> {
  if (isLocalStorage()) {
    await Local.localCompleteMultipartUpload(bucket, key, uploadId, parts);
  } else {
    await getMinioClient().completeMultipartUpload(
      bucket,
      key,
      uploadId,
      parts.map((p) => ({ part: p.partNumber, etag: p.etag })),
    );
  }

  const url = resolvePublicFileUrl(bucket, key);
  logger.info(`Multipart upload completed: ${bucket}/${key}, uploadId: ${uploadId}`);
  return { success: true, key, url, bucket };
}

export async function abortMultipartUpload(bucket: string, key: string, uploadId: string): Promise<void> {
  if (isLocalStorage()) {
    await Local.localAbortMultipartUpload(uploadId);
    return;
  }
  await getMinioClient().abortMultipartUpload(bucket, key, uploadId);
  logger.info(`Multipart upload aborted: ${bucket}/${key}, uploadId: ${uploadId}`);
}

export async function listMultipartUploadParts(
  bucket: string,
  key: string,
  uploadId: string,
): Promise<Array<{ partNumber: number; etag: string }>> {
  if (isLocalStorage()) return [];
  const result = await (getMinioClient() as any).listParts(bucket, key, uploadId);
  return result.map((part: any) => ({ partNumber: part.part, etag: part.etag }));
}
