import Joi from 'joi';
import { CREDENTIAL_TYPES, PERIOD_PRESETS } from './constants';

const isoDate = Joi.date().iso();

export const AnalyticsAccessTokensQuerySchema = Joi.object({
  preset: Joi.string()
    .valid(...PERIOD_PRESETS)
    .optional(),
  periodFrom: isoDate.optional(),
  periodTo: isoDate.optional(),
  orgId: Joi.string().uuid().optional(),
  planId: Joi.string().uuid().optional(),
  type: Joi.string()
    .valid(...CREDENTIAL_TYPES)
    .optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
