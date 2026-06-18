import Joi from 'joi';
import { WINDOW_HOURS_OPTIONS } from './constants';

export const AnalyticsLiveOpsQuerySchema = Joi.object({
  orgId: Joi.string().uuid().optional(),
  stationId: Joi.string().uuid().optional(),
  resellerId: Joi.string().uuid().optional(),
  windowHours: Joi.number()
    .valid(...WINDOW_HOURS_OPTIONS)
    .optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
