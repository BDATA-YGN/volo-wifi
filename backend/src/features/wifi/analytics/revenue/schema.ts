import Joi from 'joi';

const monthKey = Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/);

export const AnalyticsRevenueQuerySchema = Joi.object({
  month: monthKey.optional(),
  orgId: Joi.string().uuid().optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
