import Joi from 'joi';
import { STATION_STATUSES } from './constants';

export const AnalyticsSiteInventoryQuerySchema = Joi.object({
  orgId: Joi.string().uuid().optional(),
  stationId: Joi.string().uuid().optional(),
  stationSizeId: Joi.string().uuid().optional(),
  status: Joi.string()
    .valid(...STATION_STATUSES)
    .optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
