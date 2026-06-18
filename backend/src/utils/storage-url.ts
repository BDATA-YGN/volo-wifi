import { MINIO_PRIVATE_BUCKET, MINIO_PUBLIC_BUCKET } from '@/config';

const KNOWN_BUCKETS = new Set([MINIO_PUBLIC_BUCKET, MINIO_PRIVATE_BUCKET, 'mega-prod-public']);

/** Normalize any stored file reference to `{bucket}/{key}` for the storage proxy. */
export function toStorageObjectPath(
  url: string | null | undefined,
  options?: { bucket?: string | null; isPublic?: boolean | null },
): string {
  if (!url) return '';

  let path = url.trim();
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      path = new URL(path).pathname.replace(/^\/+/, '');
    } catch {
      path = path.replace(/^\/+/, '');
    }
  } else {
    path = path.replace(/^\/+/, '');
  }

  const bucket =
    options?.bucket ||
    (options?.isPublic === false ? MINIO_PRIVATE_BUCKET : MINIO_PUBLIC_BUCKET);

  const firstSegment = path.split('/')[0];
  if (!KNOWN_BUCKETS.has(firstSegment)) {
    path = `${bucket}/${path}`;
  }

  return path;
}
