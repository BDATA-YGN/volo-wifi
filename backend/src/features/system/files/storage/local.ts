import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { storageConfig } from '@/config/features/storage';

export type LocalObjectStat = { size: number; etag: string; lastModified: Date };

const multipartRoot = () => path.join(storageConfig.localDir, '.multipart');

function objectPath(bucket: string, key: string): string {
  return path.join(storageConfig.localDir, bucket, key);
}

function ensureParentDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function ensureLocalStorageRoot(): void {
  fs.mkdirSync(storageConfig.localDir, { recursive: true });
}

export async function localEnsureBucketExists(bucket: string): Promise<void> {
  fs.mkdirSync(path.join(storageConfig.localDir, bucket), { recursive: true });
}

export async function localPutObject(
  bucket: string,
  key: string,
  buffer: Buffer,
  _contentType?: string,
): Promise<void> {
  const target = objectPath(bucket, key);
  ensureParentDir(target);
  await fs.promises.writeFile(target, buffer);
}

export function localGetObject(bucket: string, key: string) {
  return createReadStream(objectPath(bucket, key));
}

export function localGetPartialObject(bucket: string, key: string, offset: number, length: number) {
  return createReadStream(objectPath(bucket, key), { start: offset, end: offset + length - 1 });
}

export async function localStatObject(bucket: string, key: string): Promise<LocalObjectStat> {
  const stat = await fs.promises.stat(objectPath(bucket, key));
  return {
    size: stat.size,
    etag: `"${stat.mtimeMs}"`,
    lastModified: stat.mtime,
  };
}

export async function localRemoveObject(bucket: string, key: string): Promise<void> {
  await fs.promises.unlink(objectPath(bucket, key));
}

export async function localListObjects(bucket: string, prefix = ''): Promise<Array<{ name: string; size: number }>> {
  const base = path.join(storageConfig.localDir, bucket, prefix);
  const results: Array<{ name: string; size: number }> = [];

  async function walk(dir: string, keyPrefix: string): Promise<void> {
    if (!fs.existsSync(dir)) return;
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const key = keyPrefix ? `${keyPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(fullPath, key);
      } else {
        const stat = await fs.promises.stat(fullPath);
        results.push({ name: `${prefix}${key}`.replace(/\/+/g, '/'), size: stat.size });
      }
    }
  }

  await walk(base, '');
  return results;
}

export async function localCopyObject(
  sourceBucket: string,
  sourceKey: string,
  destBucket: string,
  destKey: string,
): Promise<void> {
  const src = objectPath(sourceBucket, sourceKey);
  const dest = objectPath(destBucket, destKey);
  ensureParentDir(dest);
  await fs.promises.copyFile(src, dest);
}

export async function localMoveObject(
  sourceBucket: string,
  sourceKey: string,
  destBucket: string,
  destKey: string,
): Promise<void> {
  const src = objectPath(sourceBucket, sourceKey);
  const dest = objectPath(destBucket, destKey);
  ensureParentDir(dest);
  await fs.promises.rename(src, dest);
}

export async function localInitMultipartUpload(uploadId: string): Promise<void> {
  fs.mkdirSync(path.join(multipartRoot(), uploadId), { recursive: true });
}

export async function localUploadPart(uploadId: string, partNumber: number, buffer: Buffer): Promise<string> {
  const partPath = path.join(multipartRoot(), uploadId, `${partNumber}.part`);
  await fs.promises.writeFile(partPath, buffer);
  return `"part-${partNumber}"`;
}

export async function localCompleteMultipartUpload(
  bucket: string,
  key: string,
  uploadId: string,
  parts: Array<{ partNumber: number }>,
): Promise<void> {
  const sessionDir = path.join(multipartRoot(), uploadId);
  const target = objectPath(bucket, key);
  ensureParentDir(target);

  const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  const handle = await fs.promises.open(target, 'w');
  try {
    for (const part of sorted) {
      const partPath = path.join(sessionDir, `${part.partNumber}.part`);
      const data = await fs.promises.readFile(partPath);
      await handle.write(data);
    }
  } finally {
    await handle.close();
  }

  await fs.promises.rm(sessionDir, { recursive: true, force: true });
}

export async function localAbortMultipartUpload(uploadId: string): Promise<void> {
  await fs.promises.rm(path.join(multipartRoot(), uploadId), { recursive: true, force: true });
}
