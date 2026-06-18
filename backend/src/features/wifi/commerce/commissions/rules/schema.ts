import Joi from 'joi';
import { COMMISSION_TYPES, MAX_FIXED_AMOUNT, MAX_PERCENT } from './constants';

const ruleFields = {
  resellerId: Joi.string().uuid().allow(null),
  planId: Joi.string().uuid().allow(null),
  type: Joi.string().valid(...COMMISSION_TYPES),
  value: Joi.number().positive().max(MAX_FIXED_AMOUNT),
  isActive: Joi.boolean(),
};

export const CommerceCommissionsRulesCreateSchema = Joi.object({
  resellerId: ruleFields.resellerId.optional().default(null),
  planId: ruleFields.planId.optional().default(null),
  type: ruleFields.type.default('PERCENT'),
  value: ruleFields.value.required(),
  isActive: ruleFields.isActive.default(true),
})
  .custom((value, helpers) => {
    if (value.type === 'PERCENT' && value.value > MAX_PERCENT) {
      return helpers.error('any.custom', {
        message: 'Percent commission must be between 0 and 1 (e.g. 0.10 for 10%).',
      });
    }
    return value;
  })
  .unknown(false);

export const CommerceCommissionsRulesUpdateSchema = Joi.object({
  resellerId: ruleFields.resellerId.optional(),
  planId: ruleFields.planId.optional(),
  type: ruleFields.type.optional(),
  value: ruleFields.value.optional(),
  isActive: ruleFields.isActive.optional(),
})
  .min(1)
  .custom((value, helpers) => {
    if (value.type === 'PERCENT' && value.value != null && value.value > MAX_PERCENT) {
      return helpers.error('any.custom', {
        message: 'Percent commission must be between 0 and 1 (e.g. 0.10 for 10%).',
      });
    }
    return value;
  })
  .unknown(false);
