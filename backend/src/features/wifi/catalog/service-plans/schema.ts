import Joi from 'joi';
import {
  PLAN_QUOTA_TYPES,
  PLAN_TIME_USAGE_MODES,
  UNIT_TIME_VALUES,
} from './constants';

const codePattern = /^[A-Z][A-Z0-9_-]{0,47}$/;

const planFields = {
  code: Joi.string()
    .trim()
    .uppercase()
    .pattern(codePattern)
    .message('Code must start with a letter and use A-Z, 0-9, underscore, or hyphen'),
  name: Joi.string().trim().min(2).max(128),
  description: Joi.string().trim().max(500).allow('', null),
  quotaType: Joi.string().valid(...PLAN_QUOTA_TYPES),
  timeAmount: Joi.number().integer().min(1).max(999_999).allow(null),
  timeUnit: Joi.string()
    .valid(...UNIT_TIME_VALUES)
    .allow(null),
  dataMb: Joi.number().integer().min(1).max(9_999_999).allow(null),
  validityDays: Joi.number().integer().min(1).max(3650).allow(null),
  maxDevices: Joi.number().integer().min(1).max(99).allow(null),
  timeUsageMode: Joi.string().valid(...PLAN_TIME_USAGE_MODES),
  isActive: Joi.boolean(),
};

function assertQuotaFields(
  value: Record<string, unknown>,
  helpers: Joi.CustomHelpers
): Record<string, unknown> | Joi.ErrorReport {
  const quotaType = value.quotaType as string | undefined;
  if (!quotaType) return value;

  const needsTime = quotaType === 'TIME_ONLY' || quotaType === 'TIME_AND_DATA';
  const needsData = quotaType === 'DATA_ONLY' || quotaType === 'TIME_AND_DATA';

  if (needsTime) {
    if (value.timeAmount == null || value.timeUnit == null) {
      return helpers.error('any.custom', {
        message: 'Time amount and unit are required for time-based plans.',
      });
    }
  }

  if (needsData) {
    if (value.dataMb == null) {
      return helpers.error('any.custom', {
        message: 'Data quota (MB) is required for data-based plans.',
      });
    }
  }

  if (quotaType === 'DATA_ONLY' && value.timeUsageMode != null) {
    // ignored server-side; allow but strip on write
  }

  return value;
}

export const CatalogServicePlansCreateSchema = Joi.object({
  ...planFields,
  code: planFields.code.required(),
  name: planFields.name.required(),
  description: planFields.description.optional(),
  quotaType: planFields.quotaType.required(),
  timeAmount: planFields.timeAmount.optional(),
  timeUnit: planFields.timeUnit.optional(),
  dataMb: planFields.dataMb.optional(),
  validityDays: planFields.validityDays.default(1),
  maxDevices: planFields.maxDevices.default(1),
  timeUsageMode: planFields.timeUsageMode.default('CUMULATIVE_SESSIONS'),
  isActive: planFields.isActive.default(true),
})
  .custom(assertQuotaFields)
  .unknown(false);

export const CatalogServicePlansUpdateSchema = Joi.object({
  ...planFields,
  code: planFields.code.optional(),
  name: planFields.name.optional(),
  description: planFields.description.optional(),
  quotaType: planFields.quotaType.optional(),
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
