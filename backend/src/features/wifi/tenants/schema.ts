import Joi from 'joi';

export const TenantsCreateSchema = Joi.object({}).unknown(false);

export const TenantsUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200),
  description: Joi.string().trim().allow('', null).max(2000),
  isActive: Joi.boolean(),
  timezone: Joi.string().trim().min(1).max(64),
  currency: Joi.string().trim().uppercase().length(3),
  enableAnnouncement: Joi.boolean(),
  announcement: Joi.string().trim().allow('', null).max(5000),
}).min(1);
