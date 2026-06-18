import Joi from 'joi';

export const TenantProfileCreateSchema = Joi.object({}).unknown(false);

export const TenantProfileUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200),
  description: Joi.string().trim().allow('', null).max(2000),
  timezone: Joi.string().trim().min(1).max(64),
  currency: Joi.string().trim().uppercase().length(3),
  enableAnnouncement: Joi.boolean(),
  announcement: Joi.string().trim().allow('', null).max(5000),
  stationCodePrefix: Joi.string().trim().max(32).allow('', null),
  planCodePrefix: Joi.string().trim().max(32).allow('', null),
  resellerCodePrefix: Joi.string().trim().max(32).allow('', null),
}).min(1);
