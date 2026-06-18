import Joi from 'joi';

const statusValues = ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'] as const;

export const BillingSubscriptionUpdateSchema = Joi.object({
  stationLimit: Joi.number().integer().min(1).max(100000),
  status: Joi.string().valid(...statusValues),
  expiresAt: Joi.date().iso().allow(null),
  notes: Joi.string().trim().max(500).allow('', null),
  reason: Joi.string().trim().max(500).allow('', null),
})
  .min(1)
  .unknown(false);
