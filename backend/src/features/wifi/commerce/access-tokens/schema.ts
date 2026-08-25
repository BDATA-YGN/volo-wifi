import Joi from 'joi';
import { CREDENTIAL_STATUSES, MAX_ISSUE_QUANTITY, PAYMENT_METHODS } from './constants';

export const CommerceAccessTokensIssueSchema = Joi.object({
  planId: Joi.string().uuid().required(),
  stationId: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).max(MAX_ISSUE_QUANTITY).default(1),
  paymentMethod: Joi.string()
    .valid(...PAYMENT_METHODS)
    .default('CASH'),
  discount: Joi.number().min(0).max(999999999).default(0),
  note: Joi.string().trim().max(500).allow('', null),
}).unknown(false);

export const CREDENTIAL_LIFECYCLE_ACTIONS = [
  'pause',
  'unlock',
  'allowNewDevice',
  'clearSessions',
  'restoreActivated',
  'revertToSold',
] as const;

export const CommerceAccessTokensActionSchema = Joi.object({
  action: Joi.string()
    .valid(...CREDENTIAL_LIFECYCLE_ACTIONS)
    .required(),
}).unknown(false);

export const CommerceAccessTokensDeleteSessionQuerySchema = Joi.object({
  source: Joi.string().valid('hot', 'archive', 'captive').required(),
  orgId: Joi.string().uuid().optional(),
  resellerId: Joi.string().uuid().optional(),
}).unknown(true);

export const CommerceAccessTokensListQuerySchema = Joi.object({
  orgId: Joi.string().uuid().optional(),
  resellerId: Joi.string().uuid().optional(),
  formOptions: Joi.string().valid('true').optional(),
  search: Joi.string().trim().max(128).optional(),
  status: Joi.string()
    .valid(...CREDENTIAL_STATUSES)
    .optional(),
  planId: Joi.string().uuid().optional(),
  stationId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
}).unknown(true);
