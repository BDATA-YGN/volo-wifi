import { NextFunction, Request, RequestHandler, Response } from 'express';
import ejs from 'ejs';
import { logger } from '@/logging/logger';

type BaseResponse = {
  status?: number;
  message?: string;
  data?: unknown;
  meta: {
    timestamp: number | undefined;
  };
};

type BaseUIResponse = {
  status?: number;
  data?: unknown;
  content?: string;
  meta: {
    timestamp: number | undefined;
  };
};

export const responseHandler = (res: Response, statusCode: number, message: string = null, data?: unknown) => {
  const response: BaseResponse = {
    status: statusCode,
    message: message,
    data: data,
    meta: {
      timestamp: undefined,
    },
  };
  // Calculate the time taken
  const endTimestamp = new Date().getTime();
  const startTimestamp = res.locals.startTimestamp; // Assuming you set this in a middleware

  if (startTimestamp) {
    response.meta.timestamp = (endTimestamp - startTimestamp) / 1000;
  }

  return res.status(statusCode).json(response);
};

export const responseUI = (res: Response, statusCode: number, data?: unknown, content?: string) => {
  const response: BaseUIResponse = {
    status: statusCode,
    data: data,
    content: content,
    meta: {
      timestamp: undefined,
    },
  };
  // Calculate the time taken
  const endTimestamp = new Date().getTime();
  const startTimestamp = res.locals.startTimestamp; // Assuming you set this in a middleware

  if (startTimestamp) {
    response.meta.timestamp = (endTimestamp - startTimestamp) / 1000;
  }

  return res.status(statusCode).json(response);
};

export const responseTemplate = (template: string, res: Response, statusCode: number, data?: unknown) => {
  const response: BaseUIResponse = {
    status: statusCode,
    data: data,
    content: '',
    meta: {
      timestamp: undefined,
    },
  };
  // Calculate the time taken
  const endTimestamp = new Date().getTime();
  const startTimestamp = res.locals.startTimestamp; // Assuming you set this in a middleware

  if (startTimestamp) {
    response.meta.timestamp = (endTimestamp - startTimestamp) / 1000;
  }
  logger.debug('Rendering template response', { template });
  ejs.renderFile(template, data, (_err: any, str: string) => {
    if (_err) {
      statusCode = 404;
      response.content = '';
      return res.status(statusCode).json(response);
    }
    response.content = str;
    return res.status(statusCode).json(response);
  });
};

export const asyncHandler = (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);
