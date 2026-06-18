import Joi from 'joi';
import { PERIOD_PRESETS, WORKFLOW_STATUSES } from './constants';

const isoDate = Joi.date().iso();

export const AnalyticsReconciliationApprovalsQuerySchema = Joi.object({
  preset: Joi.string()
    .valid(...PERIOD_PRESETS)
    .optional(),
  periodFrom: isoDate.optional(),
  periodTo: isoDate.optional(),
  orgId: Joi.string().uuid().optional(),
  stationId: Joi.string().uuid().optional(),
  resellerId: Joi.string().uuid().optional(),
  status: Joi.string()
    .valid(...WORKFLOW_STATUSES)
    .optional(),
  settlementId: Joi.string().uuid().optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
