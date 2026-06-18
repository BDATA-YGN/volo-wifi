import Joi from 'joi';

export const NotificationTemplateSchema = Joi.object({
  code: Joi.string().required(),
  name: Joi.string().required(),
  titleTemplate: Joi.string().required(),
  bodyTemplate: Joi.string().required(),
  payloadSchema: Joi.object().optional().allow(null, ''),
  defaultChannel: Joi.string().valid('IN_APP', 'PUSH', 'EMAIL', 'SMS').required(),
  priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'CRITICAL').default('NORMAL'),
  isActive: Joi.boolean().default(true),
});

export const NotificationTemplateUpdateSchema = Joi.object({
  code: Joi.string().optional(),
  name: Joi.string().optional(),
  titleTemplate: Joi.string().optional(),
  bodyTemplate: Joi.string().optional(),
  payloadSchema: Joi.object().optional().allow(null, ''),
  defaultChannel: Joi.string().valid('IN_APP', 'PUSH', 'EMAIL', 'SMS').optional(),
  priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'CRITICAL').optional(),
  isActive: Joi.boolean().optional(),
});
