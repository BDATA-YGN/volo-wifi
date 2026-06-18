import Joi from 'joi';
import { SALE_STATUSES } from './constants';

/** Read-only ledger — query validation only */
export const CommerceTransactionsOrdersQuerySchema = Joi.object({
  orgId: Joi.string().uuid().optional(),
  resellerId: Joi.string().uuid().optional(),
  formOptions: Joi.string().valid('true').optional(),
  search: Joi.string().trim().max(128).optional(),
  status: Joi.string()
    .valid(...SALE_STATUSES)
    .optional(),
  stationId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
}).unknown(true);
