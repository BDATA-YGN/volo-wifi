import Joi from 'joi';
import { PERIOD_PRESETS } from './constants';

const isoDate = Joi.date().iso();

export const AnalyticsSitesQuerySchema = Joi.object({
  preset: Joi.string()
    .valid(...PERIOD_PRESETS)
    .optional(),
  periodFrom: isoDate.optional(),
  periodTo: isoDate.optional(),
  orgId: Joi.string().uuid().optional(),
  stationId: Joi.string().uuid().optional(),
  stationSizeId: Joi.string().uuid().optional(),
  view: Joi.string().valid('stats', 'sites', 'tiers', 'detail').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
