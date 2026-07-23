import path from 'path';
import { env } from '../env';

export type StorageProvider = 'local' | 'minio' | 'r2' | 'do_spaces';

export type StorageConfig = {
  enabled: boolean;
  provider: StorageProvider;
  endPoint: string;
  port?: number;
  useSSL: boolean;
  pathStyle: boolean;
  accessKey: string;
  secretKey: string;
  region: string;
  publicBucket: string;
  privateBucket: string;
  publicBaseUrl: string;
  localDir: string;
};

function normalizeEndpoint(raw?: string | null): { endPoint?: string; port?: number; useSSL?: boolean } {
  if (!raw) return {};
  const trimmed = String(raw).trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const u = new URL(trimmed);
    return {
      endPoint: u.hostname,
      port: u.port ? Number(u.port) : u.protocol === 'https:' ? 443 : 80,
      useSSL: u.protocol === 'https:',
    };
  }

  return { endPoint: trimmed };
}

function resolveProvider(): StorageProvider {
  if (!env.STORAGE_ENABLED) return 'local';
  const raw = (env.STORAGE_PROVIDER || 'minio').toLowerCase();
  if (raw === 'local' || raw === 'minio' || raw === 'r2' || raw === 'do_spaces') {
    return raw;
  }
  throw new Error(`Invalid STORAGE_PROVIDER="${env.STORAGE_PROVIDER}". Use: local | minio | r2 | do_spaces`);
}

const provider = resolveProvider();
const normalized = normalizeEndpoint(env.STORAGE_ENDPOINT);
const explicitPort = env.STORAGE_PORT ? Number(env.STORAGE_PORT) : undefined;

function defaultPort(useSSL: boolean, p: StorageProvider): number | undefined {
  if (p === 'local') return undefined;
  return useSSL ? 443 : 9000;
}

function defaultUseSSL(p: StorageProvider): boolean {
  if (p === 'local') return false;
  if (p === 'minio') return false;
  return true;
}

function defaultPathStyle(p: StorageProvider): boolean {
  return p === 'minio';
}

function parseBoolEnv(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true' || raw === '1';
}

const useSSL = parseBoolEnv(process.env.STORAGE_USE_SSL, normalized.useSSL ?? defaultUseSSL(provider));
const port = explicitPort ?? normalized.port ?? defaultPort(useSSL, provider);
const pathStyle = defaultPathStyle(provider);

const defaultLocalDir = path.resolve(process.cwd(), 'storages', 'uploads');
const localDir = env.STORAGE_LOCAL_DIR
  ? path.isAbsolute(env.STORAGE_LOCAL_DIR)
    ? env.STORAGE_LOCAL_DIR
    : path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR)
  : defaultLocalDir;

const sharedBucket = env.STORAGE_BUCKET.trim();
const publicBucket = env.STORAGE_PUBLIC_BUCKET.trim() || sharedBucket || 'public';
const privateBucket = env.STORAGE_PRIVATE_BUCKET.trim() || sharedBucket || 'private';

// STORAGE_PUBLIC_BASE_URL is the CDN / public URL prefix (legacy: STORAGE_EXTERNAL_URL).
const legacyExternalUrl = (process.env.STORAGE_EXTERNAL_URL || '').trim();
const publicBaseUrl = (env.STORAGE_PUBLIC_BASE_URL || legacyExternalUrl).replace(/\/?$/, '');

export const STORAGE_ENABLED = env.STORAGE_ENABLED;
export const isLocalStorage = () => !STORAGE_ENABLED || provider === 'local';

export const storageConfig: StorageConfig = {
  enabled: STORAGE_ENABLED,
  provider,
  endPoint: normalized.endPoint || '',
  port: port || undefined,
  useSSL,
  pathStyle,
  accessKey: env.STORAGE_ACCESS_KEY,
  secretKey: env.STORAGE_SECRET_KEY,
  region: env.STORAGE_REGION || (provider === 'do_spaces' ? '' : 'auto'),
  publicBucket,
  privateBucket,
  publicBaseUrl,
  localDir,
};

/** Prefix for public object URLs returned to clients (e.g. upload middleware). */
export function storagePublicUrlPrefix(bucket?: string): string {
  if (storageConfig.publicBaseUrl) {
    return `${storageConfig.publicBaseUrl}/`;
  }

  const targetBucket = bucket || storageConfig.publicBucket;

  if (isLocalStorage()) {
    return `/${targetBucket}/`;
  }

  if (storageConfig.pathStyle) {
    const proto = storageConfig.useSSL ? 'https' : 'http';
    const host = storageConfig.endPoint;
    const portSuffix =
      storageConfig.port && ![80, 443].includes(storageConfig.port) ? `:${storageConfig.port}` : '';
    return `${proto}://${host}${portSuffix}/${targetBucket}/`;
  }

  return `https://${targetBucket}.${storageConfig.endPoint}/`;
}

export function resolvePublicFileUrl(bucket: string, key: string): string {
  const prefix = storagePublicUrlPrefix(bucket).replace(/\/$/, '');
  const normalizedKey = key.replace(/^\/+/, '');
  return `${prefix}/${normalizedKey}`;
}

export function validateStorageConfig() {
  if (isLocalStorage()) return;

  if (!storageConfig.endPoint) {
    throw new Error('STORAGE_ENDPOINT is required when STORAGE_ENABLED=true');
  }
  if (!storageConfig.publicBucket) {
    throw new Error('STORAGE_PUBLIC_BUCKET is required when STORAGE_ENABLED=true');
  }
  if (!storageConfig.privateBucket) {
    throw new Error('STORAGE_PRIVATE_BUCKET is required when STORAGE_ENABLED=true');
  }
  if (!storageConfig.accessKey) {
    throw new Error('STORAGE_ACCESS_KEY is required when STORAGE_ENABLED=true');
  }
  if (!storageConfig.secretKey) {
    throw new Error('STORAGE_SECRET_KEY is required when STORAGE_ENABLED=true');
  }
  if (provider === 'do_spaces' && !storageConfig.region) {
    throw new Error('STORAGE_REGION is required when STORAGE_PROVIDER=do_spaces (e.g. nyc3, sgp1)');
  }
}
