import Joi from 'joi';

const phases = ['CHECK', 'REPLY'] as const;
const valueTypes = ['STRING', 'INTEGER', 'IPADDR', 'DATE'] as const;
const ops = [':=', '=', '+=', '==', '!=', '>', '>=', '<', '<='] as const;

const attributeRowSchema = Joi.object({
  phase: Joi.string().valid(...phases).default('REPLY'),
  attributeName: Joi.string().trim().min(1).max(128).required(),
  op: Joi.string().valid(...ops).default(':='),
  valueType: Joi.string().valid(...valueTypes).default('STRING'),
  value: Joi.string().trim().min(1).max(500).required(),
  priority: Joi.number().integer().min(0).max(9999).default(100),
  note: Joi.string().trim().max(1000).allow('', null).optional(),
}).unknown(false);

/**
 * One policy bundle = plan + vendor profile + 0..N sites (empty = global),
 * with many attribute rows (denormalized per site for FreeRADIUS).
 */
export const NetworkRadiusPlanPoliciesBundleSchema = Joi.object({
  orgId: Joi.string().uuid().required(),
  planId: Joi.string().uuid().required(),
  vendorProfileId: Joi.string().uuid().required(),
  /** Empty / omitted = plan-wide (global). */
  stationIds: Joi.array().items(Joi.string().uuid()).max(200).default([]),
  /** When updating an existing bundle. */
  policyBundleId: Joi.string().uuid().optional(),
  attributes: Joi.array().items(attributeRowSchema).min(1).max(100).required(),
}).unknown(false);
