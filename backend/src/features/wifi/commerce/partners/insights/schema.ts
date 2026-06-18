import Joi from 'joi';
import { PERIOD_PRESETS } from './constants';

const isoDate = Joi.date().iso();

export const CommercePartnersInsightsQuerySchema = Joi.object({
  preset: Joi.string()
    .valid(...PERIOD_PRESETS)
    .optional(),
  periodFrom: isoDate.optional(),
  periodTo: isoDate.optional(),
  orgId: Joi.string().uuid().optional(),
  resellerId: Joi.string().uuid().optional(),
}).unknown(true);
