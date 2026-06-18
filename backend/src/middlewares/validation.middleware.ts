import { InvalidPayloadDetail, InvalidPayloadException } from '@/utils/exception';
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '@/logging/logger';

export enum Location {
  REQUEST_BODY = 'request.body',
  REQUEST_QUERY = 'request.query',
}

export const ValidationMiddleware =
  (
    schema: Joi.ObjectSchema<any>,
    location?: Location,
    options: { abortEarly?: boolean; allowUnknown?: boolean } = {
      abortEarly: false,
      allowUnknown: false,
    },
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    const payload = location === Location.REQUEST_QUERY ? req.query : req.body;

    const { error, value } = schema.validate(payload, {
      abortEarly: options.abortEarly,
      allowUnknown: options.allowUnknown,
    });
    if (error) {
      const details: InvalidPayloadDetail[] = error.details.map(detail => ({
        message: detail.message,
        field: detail.path.join('.'),
        location,
      }));

      logger.debug('Validation failed', { location, detailsCount: details.length });
      return next(new InvalidPayloadException('Invalid Payload', details));
    }

    if (location === Location.REQUEST_QUERY) {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
