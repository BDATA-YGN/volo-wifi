import Joi from 'joi';

const phases = ['CHECK', 'REPLY'] as const;
const valueTypes = ['STRING', 'INTEGER', 'IPADDR', 'DATE'] as const;
const ops = [':=', '=', '+=', '==', '!=', '>', '>=', '<', '<='] as const;

const policyFields = {
  orgId: Joi.string().uuid().required(),
  planId: Joi.string().uuid().required(),
  vendorProfileId: Joi.string().uuid().required(),
  wifiStationId: Joi.string().uuid().allow(null).optional(),
  phase: Joi.string().valid(...phases).default('REPLY'),
  attributeName: Joi.string().trim().min(1).max(128).required(),
  op: Joi.string().valid(...ops).default(':='),
  valueType: Joi.string().valid(...valueTypes).default('STRING'),
  value: Joi.string().trim().min(1).max(500).required(),
  priority: Joi.number().integer().min(0).max(9999).default(100),
  note: Joi.string().trim().max(1000).allow('', null).optional(),
};

export const NetworkRadiusPlanPoliciesCreateSchema = Joi.object(policyFields).unknown(false);

export const NetworkRadiusPlanPoliciesUpdateSchema = Joi.object({
  orgId: Joi.string().uuid().optional(),
  planId: Joi.string().uuid().optional(),
  vendorProfileId: Joi.string().uuid().optional(),
  wifiStationId: Joi.string().uuid().allow(null).optional(),
  phase: Joi.string().valid(...phases).optional(),
  attributeName: Joi.string().trim().min(1).max(128).optional(),
  op: Joi.string().valid(...ops).optional(),
  valueType: Joi.string().valid(...valueTypes).optional(),
  value: Joi.string().trim().min(1).max(500).optional(),
  priority: Joi.number().integer().min(0).max(9999).optional(),
  note: Joi.string().trim().max(1000).allow('', null).optional(),
}).unknown(false);
