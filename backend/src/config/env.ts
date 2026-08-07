import { config as dotenvConfig } from 'dotenv';
import { bool, cleanEnv, num, port, str } from 'envalid';
import { APP_TIMEZONE, applyAppTimezone } from '../utils/app-time';

dotenvConfig({ path: '.env' });
applyAppTimezone(process.env.TZ || APP_TIMEZONE);

/**
 * Single place to parse/validate environment variables.
 * Prefer one source of truth (e.g. DATABASE_URL) over duplicated DB_* parts.
 */
export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'staging', 'production', 'test'], default: 'development' }),

  // Server ports (null = listener disabled)
  PORT: port({ default: null }),
  API_PORT: port({ default: null }),
  SOCKET_PORT: port({ default: null }),

  TZ: str({ default: APP_TIMEZONE }),

  // Database — single source; DB_* below are optional overrides only.
  // Prisma DateTime = timestamptz. Backend pg pools use session UTC (adapter-pg bug with non-UTC).
  // Display/calendar = Asia/Yangon via TZ + app-time + frontend. FreeRADIUS may use Asia/Yangon session.
  DATABASE_URL: str({
    default:
      'postgresql://postgres:password@localhost:5432/db?options=-c%20timezone%3DUTC',
  }),
  DATABASE_SSL_MODE: str({ default: '' }),
  DATABASE_SSL_ROOT_CERT: str({ default: '' }),
  DB_HOST: str({ default: '' }),
  DB_PORT: port({ default: null }),
  DB_DATABASE: str({ default: '' }),
  DB_USER: str({ default: '' }),
  DB_PASSWORD: str({ default: '' }),
  // SQL query logging — off by default in production/staging (noisy + costly).
  DB_LOG: bool({
    default: process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging',
  }),
  DB_BACKUP: str({ default: '' }),

  // Security & API
  SECRET_KEY: str({ default: 'secretKey' }),
  DEFAULT_PAGINATION_LIMIT: num({ default: 10 }),
  ALLOWED_ORIGINS: str({ default: 'http://localhost:3088' }),
  TRUST_PROXY: str({ default: '' }),

  // Logging — keep info so Dokploy shows startup / System Ready lines
  LOG_DIR: str({ default: '' }),
  LOG_FORMAT: str({ default: 'dev' }),
  LOG_LEVEL: str({ default: 'info' }),

  // Socket.IO Redis — default off so single-instance Dokploy deploys start without Redis
  SOCKET_REDIS_ENABLED: bool({ default: false }),
  IO_REDIS_URL: str({ default: '127.0.0.1:6379' }),

  // Storage — STORAGE_BUCKET sets both public/private when those are empty
  STORAGE_ENABLED: bool({ default: false }),
  STORAGE_PROVIDER: str({ default: 'minio' }), // minio | r2 | do_spaces
  STORAGE_BUCKET: str({ default: '' }),
  STORAGE_LOCAL_DIR: str({ default: '' }),
  STORAGE_ENDPOINT: str({ default: '' }),
  STORAGE_PORT: port({ default: 0 }),
  STORAGE_USE_SSL: bool({ default: false }),
  STORAGE_ACCESS_KEY: str({ default: '' }),
  STORAGE_SECRET_KEY: str({ default: '' }),
  STORAGE_PUBLIC_BUCKET: str({ default: '' }),
  STORAGE_PRIVATE_BUCKET: str({ default: '' }),
  STORAGE_PUBLIC_BASE_URL: str({ default: '' }),
  STORAGE_REGION: str({ default: 'auto' }),

  // Firebase Admin (optional)
  FIREBASE_SERVICE_ACCOUNT_JSON: str({ default: '' }),
  FIREBASE_SERVICE_ACCOUNT_PATH: str({ default: '' }),
});

applyAppTimezone(env.TZ);