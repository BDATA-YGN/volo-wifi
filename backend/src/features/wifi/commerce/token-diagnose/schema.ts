import Joi from 'joi';

export const CommerceTokenDiagnoseQuerySchema = Joi.object({
  orgId: Joi.string().uuid().optional(),
  resellerId: Joi.string().uuid().optional(),
  formOptions: Joi.string().valid('true').optional(),
  code: Joi.string().trim().max(64).optional(),
}).unknown(true);
