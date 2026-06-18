import { Request, Response } from 'express';
import { responseError } from '@/utils/api-response';

export const NotFoundMiddleware = (_req: Request, res: Response): void => {
  responseError(res, 404, { code: 'NOT_FOUND', message: 'Route not found' });
};
