import Joi from 'joi';

export const WifiOverviewQuerySchema = Joi.object({
  orgId: Joi.string().uuid().optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
