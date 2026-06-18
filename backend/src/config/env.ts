import { config as dotenvConfig } from 'dotenv';
import { bool, cleanEnv, num, port, str } from 'envalid';

dotenvConfig({ path: '.env' });

/**
 * Single place to parse/validate environment variables.
 *
 * Notes:
 * - Keep this module dependency-free besides dotenv/envalid.
 * - Feature modules should import from here instead of reading process.env directly.
 */
export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'staging', 'production', 'test'], default: 'development' }),

  // Server ports (nullable => feature can be disabled)
  PORT: port({ default: null }),
  API_PORT: port({ default: null }),
  SOCKET_PORT: port({ default: null }),

  // Core
  TZ: str({ default: 'UTC' }),
  DATABASE_URL: str({ default: 'postgresql://postgres:password@localhost:5432/db?options=-c%20timezone=UTC' }),
  DATABASE_SSL_MODE: str({ default: '' }),
  DATABASE_SSL_ROOT_CERT: str({ default: '' }),

  SECRET_KEY: str({ default: 'secretKey' }),
  ORIGIN: str({ default: '*' }),
  CREDENTIALS: bool({ default: true }),
  DEFAULT_PAGINATION_LIMIT: num({ default: 10 }),

  // DB connection parts (some code still uses these)
  DB_HOST: str({ default: 'localhost' }),
  DB_PORT: port({ default: 5432 }),
  DB_DATABASE: str({ default: '' }),
  DB_PASSWORD: str({ default: 'password' }),
  DB_USER: str({ default: 'postgres' }),

  // CORS
  ALLOWED_ORIGINS: str({ default: 'http://localhost:3088' }),

  // Logging
  LOG_DIR: str({ default: '' }),
  LOG_FORMAT: str({ default: 'dev' }),
  LOG_LEVEL: str({ default: 'info' }),

  // Backups
  DB_BACKUP: str({ default: '' }),
  DB_LOG: bool({ default: true }),

  // Socket.IO Redis (optional — set SOCKET_REDIS_ENABLED=false for local dev without Redis)
  SOCKET_REDIS_ENABLED: bool({ default: true }),
  IO_REDIS_URL: str({ default: '127.0.0.1:6379' }),

  // Storage (S3-compatible providers or local filesystem when disabled)
  STORAGE_ENABLED: bool({ default: false }),
  STORAGE_PROVIDER: str({ default: 'minio' }), // minio | r2 | do_spaces (local when STORAGE_ENABLED=false)
  STORAGE_LOCAL_DIR: str({ default: '' }),
  STORAGE_ENDPOINT: str({ default: '' }),
  STORAGE_PORT: port({ default: 0 }),
  STORAGE_USE_SSL: bool({ default: false }),
  STORAGE_ACCESS_KEY: str({ default: '' }),
  STORAGE_SECRET_KEY: str({ default: '' }),
  STORAGE_PRIVATE_BUCKET: str({ default: 'private' }),
  STORAGE_PUBLIC_BUCKET: str({ default: 'public' }),
  STORAGE_PUBLIC_BASE_URL: str({ default: '' }),
  STORAGE_REGION: str({ default: 'auto' }),
  /** @deprecated use STORAGE_PUBLIC_BASE_URL */
  STORAGE_EXTERNAL_URL: str({ default: '' }),

  // Legacy Mega folder paths (content categories)
  MEGA_COVERS: str({ default: '/covers' }),
  MEGA_ALBUM_COVERS: str({ default: '/album_covers' }),
  MEGA_PROFILES: str({ default: '/profiles' }),
  MEGA_ICONS: str({ default: '/icons' }),
  MEGA_DEFAULT: str({ default: '/default' }),
  MEGA_SLIPS: str({ default: '/slips' }),
  MEGA_ADS: str({ default: '/ads' }),
  MEGA_IMAGES: str({ default: '/images' }),
  MEGA_AUDIOS: str({ default: '/audio' }),
  MEGA_VIDEOS: str({ default: '/video' }),

  // Build/Deploy helpers
  TRUST_PROXY: str({ default: '' }),
  MOBILE_ENV: str({ default: 'development' }),
  RAILPACK_INSTALL_CMD: str({ default: 'npm install --force' }),
  RAILPACK_BUILD_CMD: str({ default: 'npm run build' }),
  RAILPACK_START_CMD: str({ default: 'npm start' }),
  SUFFIX: str({ default: 'rayhub' }),
});

