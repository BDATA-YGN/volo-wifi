// import { logger } from '@/logging/logger';
import { Request, Response, NextFunction } from 'express';

export function timingMiddleware(_req: Request, res: Response, next: NextFunction) {
  // Store the current timestamp in res.locals.startTimestamp
  // logger.info(`REQUEST: HEADERS ${typeof _req.headers == "object" ? JSON.stringify(_req.headers) : _req.headers}`);
  // logger.info(`REQUEST: BODY ${typeof _req.body == "object" ? JSON.stringify(_req.body) : _req.body}`);
  res.locals.startTimestamp = Date.now();
  next(); // Continue processing the request
}
