import * as APPLICATION from './application.json';
import { Application } from '@/interfaces/application.interface';

export { validateConfig } from './validate';
export { parseDatabaseUrl } from './database-url';

// Core exports (always available)
export * from './core';

// Storage
export {
  STORAGE_ENABLED,
  storageConfig,
  isLocalStorage,
  storagePublicUrlPrefix,
  resolvePublicFileUrl,
} from './features/storage';

export { env } from './env';
import { storageConfig as storageCfg, storagePublicUrlPrefix } from './features/storage';

export const APPLICATION_CONFIG = APPLICATION as Application;

export const STORAGE_PUBLIC_BUCKET = storageCfg.publicBucket;
export const STORAGE_PRIVATE_BUCKET = storageCfg.privateBucket;
/** @deprecated use STORAGE_PUBLIC_BUCKET / STORAGE_PRIVATE_BUCKET */
export const MINIO_PUBLIC_BUCKET = storageCfg.publicBucket;
/** @deprecated use STORAGE_PUBLIC_BUCKET / STORAGE_PRIVATE_BUCKET */
export const MINIO_PRIVATE_BUCKET = storageCfg.privateBucket;
/** @deprecated use storagePublicUrlPrefix() or STORAGE_PUBLIC_BASE_URL */
export const MEGA_CLOUD_DOMAIN = storagePublicUrlPrefix();
