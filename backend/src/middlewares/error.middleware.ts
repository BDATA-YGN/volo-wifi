import { NextFunction, Request, Response } from 'express';
import { NODE_ENV } from '@/config/core';
import {
  CustomException,
  InvalidPayloadException,
  type InvalidPayloadDetail,
} from '@/utils/exception';
import { logger } from '@/logging/logger';
import { responseError } from '@/utils/api-response';

export const ErrorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (res.headersSent) {
    logger.error({ msg: 'Error after headers sent', err: error.message });
    return;
  }

  try {
    const isCustom = error instanceof CustomException;
    const status = isCustom ? error.status : 500;
    const code = isCustom ? error.code : 'INTERNAL_SERVER_ERROR';
    const isProd = NODE_ENV === 'production' || NODE_ENV === 'staging';
    const message =
      isCustom || !isProd ? error.message : 'Something went wrong';
    const details: unknown =
      error instanceof InvalidPayloadException
        ? error.details
        : error instanceof CustomException
          ? error.details
          : undefined;

    if (!isCustom) {
      logger.error({ message: error.message, stack: error.stack });
    }

    responseError(res, status, { code, message, details });
  } catch (middlewareError) {
    logger.error(middlewareError);
    if (!res.headersSent) {
      res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' },
      });
    }
  }
};
