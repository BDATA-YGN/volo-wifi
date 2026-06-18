import Joi from 'joi';

const requirementValues = ['OPTIONAL', 'MUST'] as const;

const supportedAttributeSchema = Joi.object({
  attributeId: Joi.string().uuid().required(),
  requirement: Joi.string().valid(...requirementValues).default('OPTIONAL'),
});

const profileFields = {
  name: Joi.string().trim().min(1).max(150).required(),
  vendor: Joi.string().trim().min(1).max(100).default('Ruijie'),
  model: Joi.string().trim().max(100).allow('', null).optional(),
  description: Joi.string().trim().max(1000).allow('', null).optional(),
  supportsCoA: Joi.boolean().default(true),
  coaPort: Joi.number().integer().min(1).max(65535).allow(null).optional(),
  supportedAttributes: Joi.array().items(supportedAttributeSchema).optional(),
};

export const NetworkRadiusVendorProfilesCreateSchema = Joi.object(profileFields).unknown(false);

export const NetworkRadiusVendorProfilesUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(150).optional(),
  vendor: Joi.string().trim().min(1).max(100).optional(),
  model: Joi.string().trim().max(100).allow('', null).optional(),
  description: Joi.string().trim().max(1000).allow('', null).optional(),
  supportsCoA: Joi.boolean().optional(),
  coaPort: Joi.number().integer().min(1).max(65535).allow(null).optional(),
  supportedAttributes: Joi.array().items(supportedAttributeSchema).optional(),
}).unknown(false);
