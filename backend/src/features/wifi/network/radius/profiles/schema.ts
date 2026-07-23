import Joi from 'joi';

const profileFields = {
  name: Joi.string().trim().min(1).max(150).required(),
  sharedSecret: Joi.string().trim().min(1).max(255).allow('', null).optional(),
  serverHost: Joi.string().trim().max(64).allow('', null).optional(),
  nasType: Joi.string().trim().max(50).allow('', null).optional(),
  nasPorts: Joi.number().integer().min(0).max(65535).allow(null).optional(),
  community: Joi.string().trim().max(100).allow('', null).optional(),
  note: Joi.string().trim().max(500).allow('', null).optional(),
  isActive: Joi.boolean().optional(),
};

export const NetworkRadiusProfilesCreateSchema = Joi.object(profileFields).unknown(false);

export const NetworkRadiusProfilesUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(150).optional(),
  sharedSecret: Joi.string().trim().min(1).max(255).allow('', null).optional(),
  serverHost: Joi.string().trim().max(64).allow('', null).optional(),
  nasType: Joi.string().trim().max(50).allow('', null).optional(),
  nasPorts: Joi.number().integer().min(0).max(65535).allow(null).optional(),
  community: Joi.string().trim().max(100).allow('', null).optional(),
  note: Joi.string().trim().max(500).allow('', null).optional(),
  isActive: Joi.boolean().optional(),
}).unknown(false);
