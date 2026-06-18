import fs from 'fs';
import path from 'path';
import type { PoolConfig } from 'pg';
import type { ConnectionOptions } from 'tls';

const DEFAULT_SSL_CERT = 'ca-certificate-volo-private.crt';

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

/** Build pg Pool config with optional SSL from env. */
export function buildPgPoolConfig(connectionString: string): PoolConfig {
  const config: PoolConfig = {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
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
