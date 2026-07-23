import Joi from 'joi';
import { PRICE_BOOK_SCOPES } from './constants';

const priceAmount = Joi.number().min(0).max(999_999_999).precision(2);
const idList = Joi.array().items(Joi.string().uuid()).max(500);

export const CatalogRetailPricingBookCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(128).required(),
  scope: Joi.string()
    .valid(...PRICE_BOOK_SCOPES)
    .required(),
  resellerIds: idList.default([]),
  stationIds: idList.default([]),
  isDefault: Joi.boolean().default(false),
})
  .custom((value, helpers) => {
    const scope = value.scope as string;
    const resellerIds = (value.resellerIds ?? []) as string[];
    const stationIds = (value.stationIds ?? []) as string[];
    if (scope === 'DEFAULT' && (resellerIds.length > 0 || stationIds.length > 0)) {
      return helpers.error('any.custom', {
        message: 'Default price books cannot be scoped to a reseller or site.',
      });
    }
    if (scope === 'RESELLER' && resellerIds.length === 0) {
      return helpers.error('any.custom', {
        message: 'Select at least one reseller for reseller-scoped books.',
      });
    }
    if (scope === 'STATION' && stationIds.length === 0) {
      return helpers.error('any.custom', {
        message: 'Select at least one site for site-scoped books.',
      });
    }
    if (scope === 'RESELLER' && stationIds.length > 0) {
      return helpers.error('any.custom', { message: 'Reseller books cannot also specify sites.' });
    }
    if (scope === 'STATION' && resellerIds.length > 0) {
      return helpers.error('any.custom', { message: 'Site books cannot also specify resellers.' });
    }
    return value;
  })
  .unknown(false);

export const CatalogRetailPricingBookUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(128),
  scope: Joi.string().valid(...PRICE_BOOK_SCOPES),
  resellerIds: idList,
  stationIds: idList,
  isDefault: Joi.boolean(),
})
  .min(1)
  .custom((value, helpers) => {
    if (!value.scope) return value;
    const scope = value.scope as string;
    const resellerIds = value.resellerIds as string[] | undefined;
    const stationIds = value.stationIds as string[] | undefined;
    if (scope === 'DEFAULT' && ((resellerIds?.length ?? 0) > 0 || (stationIds?.length ?? 0) > 0)) {
      return helpers.error('any.custom', {
        message: 'Default price books cannot be scoped to a reseller or site.',
      });
    }
    if (scope === 'RESELLER' && resellerIds !== undefined && resellerIds.length === 0) {
      return helpers.error('any.custom', {
        message: 'Select at least one reseller for reseller-scoped books.',
      });
    }
    if (scope === 'STATION' && stationIds !== undefined && stationIds.length === 0) {
      return helpers.error('any.custom', {
        message: 'Select at least one site for site-scoped books.',
      });
    }
    if (scope === 'RESELLER' && (stationIds?.length ?? 0) > 0) {
      return helpers.error('any.custom', { message: 'Reseller books cannot also specify sites.' });
    }
    if (scope === 'STATION' && (resellerIds?.length ?? 0) > 0) {
      return helpers.error('any.custom', { message: 'Site books cannot also specify resellers.' });
    }
    return value;
  })
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
