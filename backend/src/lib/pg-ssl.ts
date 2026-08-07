import fs from 'fs';
import path from 'path';
import type { Pool, PoolConfig } from 'pg';
import type { ConnectionOptions } from 'tls';

/** Keep in sync with `@/utils/app-time` APP_TIMEZONE (avoid path-alias import for Prisma CLI). */
const APP_TIMEZONE = 'Asia/Yangon';

const DEFAULT_SSL_CERT = 'ca-certificate-volo-private.crt';

/** IANA-ish names only — used in libpq `-c timezone=...` (no shell metacharacters). */
const SAFE_TZ_RE = /^[A-Za-z0-9_+\-/]+$/;

/** Resolve business/session timezone (Node TZ, else Asia/Yangon). */
export function resolvePgSessionTimezone(): string {
  const tz = (process.env.TZ || APP_TIMEZONE).trim();
  if (tz && SAFE_TZ_RE.test(tz)) return tz;
  return APP_TIMEZONE;
}

/**
 * Merge `-c timezone=<tz>` into libpq `options`, preserving any other startup flags
 * already present on the connection string (e.g. search_path).
 */
export function mergePgTimezoneOptions(
  existingOptions: string,
  tz: string = resolvePgSessionTimezone(),
): string {
  const safeTz = SAFE_TZ_RE.test(tz) ? tz : APP_TIMEZONE;
  const tzFlag = `-c timezone=${safeTz}`;
  const withoutTz = (existingOptions || '')
    .replace(/(^|\s)-c\s+timezone=\S+/gi, ' ')
    .replace(/(^|\s)timezone=\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return withoutTz ? `${withoutTz} ${tzFlag}` : tzFlag;
}

/**
 * Ensure connection string carries session timezone so DO Managed URLs without
 * `options=` still get Asia/Yangon for NOW()/CURRENT_DATE/session display.
 * Returns a connection string with `options` set and a PoolConfig `options` value.
 */
export function applyPgSessionTimezone(
  connectionString: string,
  tz: string = resolvePgSessionTimezone(),
): { connectionString: string; options: string } {
  const options = mergePgTimezoneOptions('', tz);
  try {
    const url = new URL(connectionString);
    const merged = mergePgTimezoneOptions(url.searchParams.get('options') || '', tz);
    url.searchParams.set('options', merged);
    return { connectionString: url.toString(), options: merged };
  } catch {
    return { connectionString, options };
  }
}

/**
 * Non-prod probe: log `SHOW timezone` once the pool can connect.
 * No-op in production; failures are swallowed so startup is not blocked.
 */
export function probePgSessionTimezone(
  pool: Pool,
  log: (message: string) => void = console.info,
): void {
  if (process.env.NODE_ENV === 'production') return;

  void pool
    .connect()
    .then(async (client) => {
      try {
        const result = await client.query<{ TimeZone: string; timezone: string }>(
          'SHOW timezone',
        );
        const row = result.rows[0] as Record<string, string> | undefined;
        const value =
          row?.TimeZone ?? row?.timezone ?? (Object.values(row || {})[0] || '?');
        log(`PostgreSQL session timezone: ${value} (expected UTC for Prisma adapter-pg)`);
      } finally {
        client.release();
      }
    })
    .catch((err: Error) => {
      log(`PostgreSQL session timezone probe skipped: ${err.message}`);
    });
}

function sslMode(): string {
  return (process.env.DATABASE_SSL_MODE ?? '').trim().toLowerCase();
}

function backendRoot(): string {
  return path.resolve(__dirname, '../..');
}

function sslCertCandidates(rawPath: string): string[] {
  const trimmed = rawPath.trim();
  const candidates: string[] = [];

  if (trimmed) {
    if (path.isAbsolute(trimmed)) {
      candidates.push(trimmed);
    } else {
      candidates.push(path.resolve(process.cwd(), trimmed));
      candidates.push(path.join(backendRoot(), trimmed));
    }
  }

  candidates.push(path.join(backendRoot(), 'ssl', DEFAULT_SSL_CERT));
  candidates.push(path.join(process.cwd(), 'ssl', DEFAULT_SSL_CERT));
  candidates.push(path.join('/app/ssl', DEFAULT_SSL_CERT));

  return [...new Set(candidates)];
}

/** Resolve DATABASE_SSL_ROOT_CERT to an existing file path, or '' if none found. */
export function resolveSslRootCertPath(): string {
  const raw = (process.env.DATABASE_SSL_ROOT_CERT ?? '').trim();
  for (const candidate of sslCertCandidates(raw)) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return '';
}

export function isDatabaseSslEnabled(): boolean {
  const mode = sslMode();
  return mode !== '' && mode !== 'disable' && mode !== 'allow' && mode !== 'prefer';
}

/** pg `Pool` SSL options derived from DATABASE_SSL_* env vars. */
export function resolvePgSsl(): ConnectionOptions | undefined {
  const mode = sslMode();
  if (!isDatabaseSslEnabled()) return undefined;

  const certPath = resolveSslRootCertPath();
  if (certPath) {
    return {
      rejectUnauthorized: mode === 'verify-ca' || mode === 'verify-full' || mode === 'require',
      ca: fs.readFileSync(certPath, 'utf8'),
    };
  }

  // require without a CA file — encrypt only (DigitalOcean managed Postgres)
  return { rejectUnauthorized: false };
}

/**
 * Build pg Pool config with optional SSL from env.
 *
 * Session timezone defaults to **UTC** for backend Prisma/`pg` pools.
 * `@prisma/adapter-pg` mis-parses `@db.Timestamptz` when the session is not UTC
 * (relabels offset without converting — +06:30 for Asia/Yangon). See prisma#26786.
 * Business timezone for display/calendar remains Asia/Yangon via `app-time` + frontend.
 * FreeRADIUS uses its own connection with Asia/Yangon (fine for timestamptz writes).
 */
export function buildPgPoolConfig(
  connectionString: string,
  opts?: { sessionTimezone?: string },
): PoolConfig {
  // Prisma adapter requires UTC until adapter-pg timestamptz fix is deployed.
  const sessionTz = opts?.sessionTimezone ?? 'UTC';
  const { connectionString: cs, options } = applyPgSessionTimezone(connectionString, sessionTz);
  const config: PoolConfig = {
    connectionString: cs,
    // Prefer PoolConfig.options so session TZ applies even if a driver strips URL options.
    options,
    // Keep headroom for FreeRADIUS + tools on DigitalOcean managed Postgres.
    max: Number(process.env.DATABASE_POOL_MAX || 8),
    // Recycle idle clients before cloud/LB silent drops (common cause of
    // "Connection terminated unexpectedly").
    idleTimeoutMillis: Number(process.env.DATABASE_POOL_IDLE_MS || 20_000),
    // Remote DO latency from local/dev often ~1s; spikes need more than 10s.
    connectionTimeoutMillis: Number(process.env.DATABASE_POOL_CONNECT_MS || 30_000),
    allowExitOnIdle: true,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    application_name: process.env.DATABASE_APPLICATION_NAME || 'volo-wifi-backend',
  };
  const ssl = resolvePgSsl();
  if (ssl) {
    config.ssl = ssl;
  }
  return config;
}

/** Append sslmode/sslrootcert query params for Prisma CLI and libpq connection strings. */
export function withDatabaseSslParams(connectionString: string): string {
  const mode = (process.env.DATABASE_SSL_MODE ?? '').trim();
  const certPath = resolveSslRootCertPath();
  if (!mode || mode.toLowerCase() === 'disable') return connectionString;

  const separator = connectionString.includes('?') ? '&' : '?';
  let params = `sslmode=${encodeURIComponent(mode)}`;
  if (certPath) {
    params += `&sslrootcert=${encodeURIComponent(certPath)}`;
  }
  return `${connectionString}${separator}${params}`;
}

/** Set PGSSLMODE / PGSSLROOTCERT for psql and pg_dump CLI tools. */
export function applyPgSslEnv(): void {
  const mode = (process.env.DATABASE_SSL_MODE ?? '').trim();
  const certPath = resolveSslRootCertPath();
  if (mode && mode.toLowerCase() !== 'disable') {
    process.env.PGSSLMODE = mode;
  }
  if (certPath) {
    process.env.PGSSLROOTCERT = certPath;
  }
}
