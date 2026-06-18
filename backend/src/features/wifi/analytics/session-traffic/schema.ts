import Joi from 'joi';
import { PERIOD_PRESETS } from './constants';

const isoDate = Joi.date().iso();

export const AnalyticsSessionTrafficQuerySchema = Joi.object({
  preset: Joi.string()
    .valid(...PERIOD_PRESETS)
    .optional(),
  periodFrom: isoDate.optional(),
  periodTo: isoDate.optional(),
  orgId: Joi.string().uuid().optional(),
  stationId: Joi.string().uuid().optional(),
  planId: Joi.string().uuid().optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
