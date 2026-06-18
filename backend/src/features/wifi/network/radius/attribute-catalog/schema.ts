import Joi from 'joi';

const valueTypes = ['STRING', 'INTEGER', 'IPADDR', 'DATE'] as const;
const ops = [':=', '=', '+=', '==', '!=', '>', '>=', '<', '<='] as const;

const attributeFields = {
  freeradiusName: Joi.string().trim().min(1).max(128).required(),
  displayName: Joi.string().trim().min(1).max(150).required(),
  op: Joi.string().valid(...ops).default(':='),
  defaultValue: Joi.string().trim().max(500).allow('', null).optional(),
  valueType: Joi.string().valid(...valueTypes).default('STRING'),
  note: Joi.string().trim().max(2000).allow('', null).optional(),
};

export const NetworkRadiusAttributeCatalogCreateSchema = Joi.object(attributeFields).unknown(false);

export const NetworkRadiusAttributeCatalogUpdateSchema = Joi.object({
  freeradiusName: Joi.string().trim().min(1).max(128).optional(),
  displayName: Joi.string().trim().min(1).max(150).optional(),
  op: Joi.string().valid(...ops).optional(),
  defaultValue: Joi.string().trim().max(500).allow('', null).optional(),
  valueType: Joi.string().valid(...valueTypes).optional(),
  note: Joi.string().trim().max(2000).allow('', null).optional(),
}).unknown(false);
