import Joi from 'joi';

const priceFields = {
  stationSizeId: Joi.string().uuid(),
  unitPrice: Joi.number().positive().precision(2).max(999999999999),
  currency: Joi.string().trim().uppercase().min(3).max(8),
  billingCycle: Joi.string().valid('MONTHLY'),
  effectiveFrom: Joi.date().iso(),
  effectiveTo: Joi.date().iso().allow(null),
  isActive: Joi.boolean(),
};

export const BillingTierRatesPlatformCreateSchema = Joi.object({
  stationSizeId: priceFields.stationSizeId.required(),
  unitPrice: priceFields.unitPrice.required(),
  currency: priceFields.currency.default('MMK'),
  billingCycle: priceFields.billingCycle.default('MONTHLY'),
  effectiveFrom: priceFields.effectiveFrom.required(),
  effectiveTo: priceFields.effectiveTo.optional(),
  isActive: priceFields.isActive.default(true),
}).unknown(false);

export const BillingTierRatesPlatformUpdateSchema = Joi.object({
  unitPrice: priceFields.unitPrice.optional(),
  currency: priceFields.currency.optional(),
  effectiveFrom: priceFields.effectiveFrom.optional(),
  effectiveTo: priceFields.effectiveTo.optional(),
  isActive: priceFields.isActive.optional(),
})
  .min(1)
  .unknown(false);
