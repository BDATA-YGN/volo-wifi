import path from 'path';
import { env } from './env';

export const NODE_ENV = env.NODE_ENV;

export const PORT = env.PORT;
export const API_PORT = env.API_PORT;
export const SOCKET_PORT = env.SOCKET_PORT;

export const TZ = env.TZ;
export const DATABASE_URL = env.DATABASE_URL;
export const DATABASE_SSL_MODE = env.DATABASE_SSL_MODE;
export const DATABASE_SSL_ROOT_CERT = env.DATABASE_SSL_ROOT_CERT;

export const SECRET_KEY = env.SECRET_KEY;
export const ORIGIN = env.ORIGIN;
export const CREDENTIALS = env.CREDENTIALS;
export const DEFAULT_PAGINATION_LIMIT = env.DEFAULT_PAGINATION_LIMIT;

export const DB_HOST = env.DB_HOST;
export const DB_PORT = env.DB_PORT;
export const DB_DATABASE = env.DB_DATABASE;
export const DB_PASSWORD = env.DB_PASSWORD;
export const DB_USER = env.DB_USER;

export const ALLOWED_ORIGINS = env.ALLOWED_ORIGINS;

export const LOG_FORMAT = env.LOG_FORMAT;
export const LOG_LEVEL = env.LOG_LEVEL;

// Prefer project-relative defaults unless user explicitly provides absolute/custom.
const defaultLogsDir = path.resolve(process.cwd(), 'storages', 'logs');
const defaultBackupsDir = path.resolve(process.cwd(), 'storages', 'backups');

export const LOG_DIR = env.LOG_DIR ? resolveMaybeRelative(env.LOG_DIR) : defaultLogsDir;
export const DB_BACKUP = env.DB_BACKUP ? resolveMaybeRelative(env.DB_BACKUP) : defaultBackupsDir;
export const DB_LOG = env.DB_LOG;

export const RAILPACK_INSTALL_CMD = env.RAILPACK_INSTALL_CMD;
export const RAILPACK_BUILD_CMD = env.RAILPACK_BUILD_CMD;
export const RAILPACK_START_CMD = env.RAILPACK_START_CMD;
export const SUFFIX = env.SUFFIX;

export const SOCKET_REDIS_ENABLED = env.SOCKET_REDIS_ENABLED;
export const IO_REDIS_URL = env.IO_REDIS_URL;

function resolveMaybeRelative(p: string) {
  // If it's relative, resolve against project root (process.cwd()).
  if (!p) return p;
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

