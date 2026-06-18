import Joi from 'joi';

const codePattern = /^[A-Z][A-Z0-9_]{0,31}$/;

const tierFields = {
  code: Joi.string()
    .trim()
    .uppercase()
    .pattern(codePattern)
    .message('Code must be SCREAMING_SNAKE_CASE (e.g. SMALL, MEDIUM, XL)'),
  name: Joi.string().trim().min(2).max(128),
  description: Joi.string().trim().max(500).allow('', null),
  sortOrder: Joi.number().integer().min(0).max(9999),
  isActive: Joi.boolean(),
};

export const BillingCapacityTiersCreateSchema = Joi.object({
  ...tierFields,
  code: tierFields.code.required(),
  name: tierFields.name.required(),
  description: tierFields.description.optional(),
  sortOrder: tierFields.sortOrder.default(0),
  isActive: tierFields.isActive.default(true),
}).unknown(false);

export const BillingCapacityTiersUpdateSchema = Joi.object({
  ...tierFields,
  code: tierFields.code.optional(),
  name: tierFields.name.optional(),
  description: tierFields.description.optional(),
  sortOrder: tierFields.sortOrder.optional(),
  isActive: tierFields.isActive.optional(),
})
  .min(1)
  .unknown(false);
