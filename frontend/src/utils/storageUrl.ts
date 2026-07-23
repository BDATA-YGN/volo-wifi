const DEFAULT_PUBLIC_BUCKET = "public";
const DEFAULT_PRIVATE_BUCKET = "private";

/** Known MinIO bucket names — first path segment if present. */
const KNOWN_BUCKETS = new Set([DEFAULT_PUBLIC_BUCKET, DEFAULT_PRIVATE_BUCKET, "mega-prod-public"]);

/**
 * Strip domain / leading slashes and return the object key path stored in MinIO.
 * e.g. `https://minio.example.com/public/foo/bar.webp` → `public/foo/bar.webp`
 */
export function extractStorageKey(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("blob:")) return trimmed;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      return new URL(trimmed).pathname.replace(/^\/+/, "");
    } catch {
      return trimmed.replace(/^\/+/, "");
    }
  }

  return trimmed.replace(/^\/+/, "");
}

function resolveBucket(options?: { bucket?: string | null; isPublic?: boolean | null }): string {
  if (options?.bucket) return options.bucket;
  if (options?.isPublic === false) return DEFAULT_PRIVATE_BUCKET;
  return DEFAULT_PUBLIC_BUCKET;
}

function withBucketPrefix(objectPath: string, bucket: string): string {
  if (!objectPath) return "";
  const firstSegment = objectPath.split("/")[0];
  if (KNOWN_BUCKETS.has(firstSegment)) return objectPath;
  return `${bucket}/${objectPath}`;
}

/**
 * Resolve a stored file reference to a browser-loadable URL via the backend
 * MinIO storage proxy (`GET /console/:bucket/*`).
 *
 * Direct MinIO / CDN URLs are never returned — they fail when buckets are private.
 */
export function resolveStorageFileUrl(
  url: string | null | undefined,
  options?: { bucket?: string | null; isPublic?: boolean | null },
): string {
  if (!url) return "";
  if (url.startsWith("blob:")) return url;

  const bucket = resolveBucket(options);
  const objectPath = withBucketPrefix(extractStorageKey(url), bucket);
  if (!objectPath) return "";

  const uploadBase = (
    process.env.NEXT_PUBLIC_UPLOAD_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  if (uploadBase) {
    return `${uploadBase}/${objectPath}`;
  }

  // Same-origin fallback — proxied by Next.js rewrite to the console API.
  return `/file-proxy/${objectPath}`;
}
