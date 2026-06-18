import { existsSync, mkdirSync } from 'fs';
import * as winston from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');
import { LOG_DIR, LOG_LEVEL } from '@config';

let logDirReady = Boolean(LOG_DIR);
if (LOG_DIR && !existsSync(LOG_DIR)) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    logDirReady = false;
    console.warn(`Failed to create LOG_DIR="${LOG_DIR}". File logging disabled.`);
  }
}

const transports: winston.transport[] = [
  new winston.transports.Console({
    format:
      process.env.NODE_ENV === 'development'
        ? winston.format.combine(winston.format.colorize(), winston.format.simple())
        : winston.format.combine(winston.format.timestamp(), winston.format.simple()),
  }),
];

if (logDirReady && LOG_DIR) {
  transports.push(
    new DailyRotateFile({
      dirname: `${LOG_DIR}/combined`,
      filename: `%DATE%.log`,
      maxFiles: '30d',
      format: winston.format.json(),
    }),
  );
}

const logger = winston.createLogger({
  level: LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports,
});

const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export { logger, stream };
