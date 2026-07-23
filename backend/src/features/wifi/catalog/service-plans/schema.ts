import Joi from 'joi';
import { PLAN_TIME_USAGE_MODES, UNIT_TIME_VALUES } from './constants';
import { assertPlanLimitFields } from './plan-limits';

const codePattern = /^[A-Z][A-Z0-9_-]{0,47}$/;

const planFields = {
  code: Joi.string()
    .trim()
    .uppercase()
    .pattern(codePattern)
    .message('Code must start with a letter and use A-Z, 0-9, underscore, or hyphen'),
  name: Joi.string().trim().min(2).max(128),
  description: Joi.string().trim().max(500).allow('', null),
  /** Client may omit; server derives from timeAmount/dataMb. */
  quotaType: Joi.any().strip(),
  timeAmount: Joi.number().integer().min(0).max(999_999),
  timeUnit: Joi.string()
    .valid(...UNIT_TIME_VALUES)
    .allow(null),
  dataMb: Joi.number().integer().min(0).max(9_999_999),
  validityDays: Joi.number().integer().min(1).max(3650).allow(null),
  maxDevices: Joi.number().integer().min(1).max(99).allow(null),
  timeUsageMode: Joi.string().valid(...PLAN_TIME_USAGE_MODES),
  isActive: Joi.boolean(),
};

function assertLimitFields(
  value: Record<string, unknown>,
  helpers: Joi.CustomHelpers
): Record<string, unknown> | Joi.ErrorReport {
  if (value.timeAmount === undefined && value.dataMb === undefined) {
    return value;
  }

  const timeAmount = value.timeAmount as number | undefined;
  const dataMb = value.dataMb as number | undefined;

  // Create always sends both; update may send one — skip full assert until controller merge.
  if (timeAmount === undefined || dataMb === undefined) {
    return value;
  }

  const err = assertPlanLimitFields({
    timeAmount,
    timeUnit: value.timeUnit as string | null | undefined,
    dataMb,
  });
  if (err) {
    return helpers.error('any.custom', { message: err });
  }
  return value;
}

export const CatalogServicePlansCreateSchema = Joi.object({
  ...planFields,
  code: planFields.code.required(),
  name: planFields.name.required(),
  description: planFields.description.optional(),
  timeAmount: planFields.timeAmount.required(),
  timeUnit: planFields.timeUnit.optional(),
  dataMb: planFields.dataMb.required(),
  validityDays: planFields.validityDays.default(1),
  maxDevices: planFields.maxDevices.default(1),
  timeUsageMode: planFields.timeUsageMode.default('CUMULATIVE_SESSIONS'),
  isActive: planFields.isActive.default(true),
})
  .custom(assertLimitFields)
  .unknown(false);

export const CatalogServicePlansUpdateSchema = Joi.object({
  ...planFields,
  code: planFields.code.optional(),
  name: planFields.name.optional(),
  description: planFields.description.optional(),
  timeAmount: planFields.timeAmount.optional(),
  timeUnit: planFields.timeUnit.optional(),
  dataMb: planFields.dataMb.optional(),
  validityDays: planFields.validityDays.optional(),
  maxDevices: planFields.maxDevices.optional(),
  timeUsageMode: planFields.timeUsageMode.optional(),
  isActive: planFields.isActive.optional(),
})
  .min(1)
  .unknown(false);
