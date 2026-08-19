import Joi from 'joi';

export const AnalyticsLiveOpsQuerySchema = Joi.object({
  orgId: Joi.string().uuid().optional(),
  stationId: Joi.string().uuid().optional(),
  stationSizeId: Joi.string().uuid().optional(),
  planId: Joi.string().uuid().optional(),
  profile: Joi.string().trim().max(64).optional(),
  date: Joi.string().trim().optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
