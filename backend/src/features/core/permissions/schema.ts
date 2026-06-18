import Joi from 'joi';

export const MapRoleSettingsSchema = Joi.object({
  id: Joi.string().uuid().required(),
  roleId: Joi.number().integer().required(),
  settingKey: Joi.string().required(),
  enable: Joi.boolean().default(true),
  visibility: Joi.boolean().default(true),
});

/** Manual create via menu-permission API: only button or feature (not menu-derived). */
export const MngRoleSettingsManualCreateSchema = Joi.object({
  settingKey: Joi.string().required(),
  description: Joi.string().allow(null, ''),
  kind: Joi.string().valid('button', 'feature').required(),
});

/** Update via menu-permission: never change menu/menuGroup rows into manual kinds here. */
export const MngRoleSettingsManualUpdateSchema = Joi.object({
  settingKey: Joi.string().optional(),
  description: Joi.string().allow(null, ''),
  kind: Joi.string().valid('button', 'feature').optional(),
});

export const MngRolesSchema = Joi.object({
  roleId: Joi.number().integer().required(),
  roleName: Joi.string().required(),
  description: Joi.string().allow(null),
});
