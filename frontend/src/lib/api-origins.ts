/** Strip a trailing slash so we can append `/health`, `/auth/login`, etc. */
export function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Backend origin used by Next.js server code (rewrites, server actions, /health).
 * In Dokploy this must be the Docker-internal URL, not the Cloudflare public host.
 */
export function getServerApiBaseUrl(): string {
  return stripTrailingSlash(
    process.env.INTERNAL_API_URL ||
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "",
  );
}

/** Backend origin used in the browser. Prefer the public HTTPS API host. */
export function getPublicApiBaseUrl(): string {
  return stripTrailingSlash(process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "");
}
