import Joi from 'joi';
import { ELIGIBILITY_STATUSES } from './constants';

export const AnalyticsReconciliationCoverageQuerySchema = Joi.object({
  orgId: Joi.string().uuid().optional(),
  stationId: Joi.string().uuid().optional(),
  resellerId: Joi.string().uuid().optional(),
  eligibility: Joi.string()
    .valid(...ELIGIBILITY_STATUSES)
    .optional(),
  coverageId: Joi.string().uuid().optional(),
  formOptions: Joi.string().valid('true').optional(),
}).unknown(true);
