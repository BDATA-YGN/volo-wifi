import { existsSync, mkdirSync } from 'fs';
import * as winston from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');
import { LOG_DIR, LOG_LEVEL, NODE_ENV } from '@config';

let logDirReady = Boolean(LOG_DIR);
if (LOG_DIR && !existsSync(LOG_DIR)) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    logDirReady = false;
    // eslint-disable-next-line no-console
    console.warn(`Failed to create LOG_DIR="${LOG_DIR}". File logging disabled.`);
  }
}

const isDev = NODE_ENV === 'development';

/** Human-readable console lines — critical for Dokploy / Docker log viewers. */
const consoleFormat = winston.format.printf((info) => {
  const { level, message, timestamp, stack, splat: _splat, ...rest } = info;
  const meta: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === 'symbol') continue;
    meta[key] = value;
  }
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const body =
    typeof stack === 'string'
      ? stack
      : typeof message === 'string'
        ? message
        : JSON.stringify(message);
  return `${timestamp} ${level}: ${body}${metaStr}`;
});

const transports: winston.transport[] = [
  new winston.transports.Console({
    stderrLevels: ['error'],
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      isDev ? winston.format.colorize({ all: true }) : winston.format.uncolorize(),
      consoleFormat,
    ),
  }),
];

if (logDirReady && LOG_DIR) {
  transports.push(
    new DailyRotateFile({
      dirname: `${LOG_DIR}/combined`,
      filename: `%DATE%.log`,
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
  );
}

const logger = winston.createLogger({
  level: LOG_LEVEL || 'info',
  // Keep root format minimal; each transport owns its shape (console vs file JSON).
  format: winston.format.combine(winston.format.errors({ stack: true }), winston.format.splat()),
  transports,
  exitOnError: false,
});

const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export { logger, stream };
