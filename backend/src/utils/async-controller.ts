import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Express route handler that may return a Promise (errors forwarded to ErrorMiddleware). */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

/**
 * Wraps async controllers so rejections reach `ErrorMiddleware` via `next(err)`.
 * Prefer this over duplicating try/catch in every handler.
 */
export const asyncController = (fn: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
