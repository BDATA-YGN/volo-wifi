import Joi from 'joi';

const deviceTypes = ['ROUTER', 'AP', 'CONTROLLER', 'SWITCH'] as const;

const deviceFields = {
  orgId: Joi.string().uuid().required(),
  stationId: Joi.string().uuid().allow(null).optional(),
  type: Joi.string().valid(...deviceTypes).default('ROUTER'),
  vendor: Joi.string().max(100).allow('', null).optional(),
  model: Joi.string().max(100).allow('', null).optional(),
  serialNo: Joi.string().max(100).allow('', null).optional(),
  macAddr: Joi.string().max(64).allow('', null).optional(),
  ipAddr: Joi.string().max(64).allow('', null).optional(),
  note: Joi.string().max(500).allow('', null).optional(),
  isRadiusClient: Joi.boolean().default(false),
  radiusSecret: Joi.string().max(255).allow('', null).optional(),
  nasShortname: Joi.string().max(100).allow('', null).optional(),
  nasType: Joi.string().max(50).allow('', null).optional(),
  nasPorts: Joi.number().integer().min(0).max(65535).allow(null).optional(),
  nasServer: Joi.string().max(64).allow('', null).optional(),
  nasCommunity: Joi.string().max(100).allow('', null).optional(),
};

export const NetworkNasDevicesCreateSchema = Joi.object(deviceFields).unknown(false);

export const NetworkNasDevicesUpdateSchema = Joi.object({
  orgId: Joi.string().uuid().optional(),
  stationId: Joi.string().uuid().allow(null).optional(),
  type: Joi.string().valid(...deviceTypes).optional(),
  vendor: Joi.string().max(100).allow('', null).optional(),
  model: Joi.string().max(100).allow('', null).optional(),
  serialNo: Joi.string().max(100).allow('', null).optional(),
  macAddr: Joi.string().max(64).allow('', null).optional(),
  ipAddr: Joi.string().max(64).allow('', null).optional(),
  note: Joi.string().max(500).allow('', null).optional(),
  isRadiusClient: Joi.boolean().optional(),
  radiusSecret: Joi.string().max(255).allow('', null).optional(),
  nasShortname: Joi.string().max(100).allow('', null).optional(),
  nasType: Joi.string().max(50).allow('', null).optional(),
  nasPorts: Joi.number().integer().min(0).max(65535).allow(null).optional(),
  nasServer: Joi.string().max(64).allow('', null).optional(),
  nasCommunity: Joi.string().max(100).allow('', null).optional(),
}).unknown(false);
