import * as APPLICATION from './application.json';
import { Application } from '@/interfaces/application.interface';

export { validateConfig } from './validate';

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
import { env as _env } from './env';
import { storageConfig as storageCfg, storagePublicUrlPrefix } from './features/storage';

export const APPLICATION_CONFIG = APPLICATION as Application;

export const MEGA_COVERS = _env.MEGA_COVERS;
export const MEGA_ALBUM_COVERS = _env.MEGA_ALBUM_COVERS;
export const MEGA_PROFILES = _env.MEGA_PROFILES;
export const MEGA_ICONS = _env.MEGA_ICONS;
export const MEGA_DEFAULT = _env.MEGA_DEFAULT;
export const MEGA_SLIPS = _env.MEGA_SLIPS;
export const MEGA_ADS = _env.MEGA_ADS;
export const MEGA_IMAGES = _env.MEGA_IMAGES;
export const MEGA_AUDIOS = _env.MEGA_AUDIOS;
export const MEGA_VIDEOS = _env.MEGA_VIDEOS;

export const STORAGE_PUBLIC_BUCKET = storageCfg.publicBucket;
export const STORAGE_PRIVATE_BUCKET = storageCfg.privateBucket;
export const MINIO_PUBLIC_BUCKET = storageCfg.publicBucket;
export const MINIO_PRIVATE_BUCKET = storageCfg.privateBucket;
/** @deprecated use storagePublicUrlPrefix() or STORAGE_PUBLIC_BASE_URL */
export const MEGA_CLOUD_DOMAIN = storagePublicUrlPrefix();
