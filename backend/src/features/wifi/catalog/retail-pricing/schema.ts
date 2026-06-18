import Joi from 'joi';
import { PRICE_BOOK_SCOPES } from './constants';

const priceAmount = Joi.number().min(0).max(999_999_999).precision(2);

export const CatalogRetailPricingBookCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(128).required(),
  scope: Joi.string()
    .valid(...PRICE_BOOK_SCOPES)
    .required(),
  resellerId: Joi.string().uuid().allow(null),
  stationId: Joi.string().uuid().allow(null),
  isDefault: Joi.boolean().default(false),
})
  .custom((value, helpers) => {
    const scope = value.scope as string;
    if (scope === 'DEFAULT' && (value.resellerId || value.stationId)) {
      return helpers.error('any.custom', {
        message: 'Default price books cannot be scoped to a reseller or site.',
      });
    }
    if (scope === 'RESELLER' && !value.resellerId) {
      return helpers.error('any.custom', { message: 'Reseller is required for reseller-scoped books.' });
    }
    if (scope === 'STATION' && !value.stationId) {
      return helpers.error('any.custom', { message: 'Site is required for site-scoped books.' });
    }
    if (scope === 'RESELLER' && value.stationId) {
      return helpers.error('any.custom', { message: 'Reseller books cannot also specify a site.' });
    }
    if (scope === 'STATION' && value.resellerId) {
      return helpers.error('any.custom', { message: 'Site books cannot also specify a reseller.' });
    }
    return value;
  })
  .unknown(false);

export const CatalogRetailPricingBookUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(128),
  scope: Joi.string().valid(...PRICE_BOOK_SCOPES),
  resellerId: Joi.string().uuid().allow(null),
  stationId: Joi.string().uuid().allow(null),
  isDefault: Joi.boolean(),
})
  .min(1)
  .unknown(false);

export const CatalogRetailPricingPriceCreateSchema = Joi.object({
  priceBookId: Joi.string().uuid().required(),
  planId: Joi.string().uuid().required(),
  retailPrice: priceAmount.required(),
  costPrice: priceAmount.allow(null),
  isActive: Joi.boolean().default(true),
}).unknown(false);

export const CatalogRetailPricingPriceUpdateSchema = Joi.object({
  retailPrice: priceAmount,
  costPrice: priceAmount.allow(null),
  isActive: Joi.boolean(),
})
  .min(1)
  .unknown(false);
