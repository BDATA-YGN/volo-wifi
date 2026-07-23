import path from 'path';
import { env } from './env';
import { parseDatabaseUrl } from './database-url';

export const NODE_ENV = env.NODE_ENV;

export const PORT = env.PORT;
export const API_PORT = env.API_PORT;
export const SOCKET_PORT = env.SOCKET_PORT;

export const TZ = env.TZ;
export const DATABASE_URL = env.DATABASE_URL;
export const DATABASE_SSL_MODE = env.DATABASE_SSL_MODE;
export const DATABASE_SSL_ROOT_CERT = env.DATABASE_SSL_ROOT_CERT;

export const SECRET_KEY = env.SECRET_KEY;
export const DEFAULT_PAGINATION_LIMIT = env.DEFAULT_PAGINATION_LIMIT;

export const ALLOWED_ORIGINS = env.ALLOWED_ORIGINS;

export const LOG_FORMAT = env.LOG_FORMAT;
export const LOG_LEVEL = env.LOG_LEVEL;

const defaultLogsDir = path.resolve(process.cwd(), 'storages', 'logs');
const defaultBackupsDir = path.resolve(process.cwd(), 'storages', 'backups');

export const LOG_DIR = env.LOG_DIR ? resolveMaybeRelative(env.LOG_DIR) : defaultLogsDir;
export const DB_BACKUP = env.DB_BACKUP ? resolveMaybeRelative(env.DB_BACKUP) : defaultBackupsDir;
export const DB_LOG = env.DB_LOG;

export const SOCKET_REDIS_ENABLED = env.SOCKET_REDIS_ENABLED;
export const IO_REDIS_URL = env.IO_REDIS_URL;

/** Prefer DATABASE_URL; optional DB_* only override when explicitly set. */
const fromUrl = parseDatabaseUrl(DATABASE_URL);

export const DB_HOST = env.DB_HOST || fromUrl?.host || 'localhost';
export const DB_PORT = env.DB_PORT ?? fromUrl?.port ?? 5432;
export const DB_DATABASE = env.DB_DATABASE || fromUrl?.database || 'db';
export const DB_USER = env.DB_USER || fromUrl?.user || 'postgres';
export const DB_PASSWORD = env.DB_PASSWORD || fromUrl?.password || '';

function resolveMaybeRelative(p: string) {
  if (!p) return p;
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}
