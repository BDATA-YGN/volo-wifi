import Joi from 'joi';
import { DEVICE_TYPES } from './constants';

export const AnalyticsNasInventoryQuerySchema = Joi.object({
  orgId: Joi.string().uuid().optional(),
  stationId: Joi.string().uuid().optional(),
  type: Joi.string()
    .valid(...DEVICE_TYPES)
    .optional(),
  isRadiusClient: Joi.string().valid('true', 'false').optional(),
  unassigned: Joi.string().valid('true').optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
