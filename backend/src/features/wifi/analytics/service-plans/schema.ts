import Joi from 'joi';
import { PERIOD_PRESETS, PLAN_QUOTA_TYPES } from './constants';

const isoDate = Joi.date().iso();

export const AnalyticsServicePlansQuerySchema = Joi.object({
  preset: Joi.string()
    .valid(...PERIOD_PRESETS)
    .optional(),
  periodFrom: isoDate.optional(),
  periodTo: isoDate.optional(),
  orgId: Joi.string().uuid().optional(),
  planId: Joi.string().uuid().optional(),
  quotaType: Joi.string()
    .valid(...PLAN_QUOTA_TYPES)
    .optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
