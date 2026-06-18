import type { Response } from 'express';
import { NODE_ENV } from '@/config/core';
import { logger } from '../logging/logger';

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export function responseSuccess(
  res: Response,
  data: { status?: number; message: string; data?: unknown; meta?: unknown },
): void {
  res.status(data?.status ?? 200).json({
    message: data.message,
    data: data.data,
    meta: data.meta,
  });
}

export function responseError(res: Response, status: number, error: ApiErrorBody): void {
  const isProd = NODE_ENV === 'production' || NODE_ENV === 'staging';
  const details =
    status >= 500 && isProd ? undefined : error.details;

  logger.error({
    msg: 'API error response',
    status,
    code: error.code,
    message: error.message,
    ...(isProd ? {} : { details: error.details }),
  });

  res.status(status).json({
    error: {
      code: error.code,
      message: error.message,
      ...(details !== undefined ? { details } : {}),
    },
  });
}
