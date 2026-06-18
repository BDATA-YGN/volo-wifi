import Joi from 'joi';

export const TenantRegistrationSchema = Joi.object({
  org: Joi.object({
    code: Joi.string().trim().uppercase().min(2).max(32).required(),
    name: Joi.string().trim().min(2).max(128).required(),
    description: Joi.string().trim().max(500).allow('', null).optional(),
    timezone: Joi.string().default('Asia/Yangon'),
    currency: Joi.string().default('MMK'),
    stationCodePrefix: Joi.string().max(16).allow('').optional(),
    planCodePrefix: Joi.string().max(16).allow('').optional(),
    resellerCodePrefix: Joi.string().max(16).allow('').optional(),
  }).required(),
  license: Joi.object({
    stationLimit: Joi.number().integer().min(1).max(10000).required(),
    billingCycle: Joi.string().valid('MONTHLY').default('MONTHLY'),
    effectiveFrom: Joi.date().iso().required(),
    expiresAt: Joi.date().iso().allow(null).optional(),
    notes: Joi.string().max(500).allow('', null).optional(),
  }).required(),
  owner: Joi.object({
    fullName: Joi.string().trim().min(2).max(128).required(),
    username: Joi.string().trim().min(3).max(64).required(),
    email: Joi.string().trim().email().allow('', null).optional(),
    phoneNumber: Joi.string().trim().max(32).allow('', null).optional(),
    password: Joi.string().min(8).required(),
  }).required(),
  usePlatformTierRates: Joi.boolean().default(true),
  tierRateOverrides: Joi.when('usePlatformTierRates', {
    is: false,
    then: Joi.array()
      .items(
        Joi.object({
          stationSizeId: Joi.string().uuid().required(),
          unitPrice: Joi.number().positive().required(),
          currency: Joi.string().default('MMK'),
        }),
      )
      .min(1)
      .required(),
    otherwise: Joi.array().optional(),
  }),
});
