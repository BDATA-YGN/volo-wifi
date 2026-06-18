import Joi from 'joi';
import { passwordMeetsStrengthRules, passwordStrengthErrorMessage } from '@/utils/passwordStrength';
import { MEMBER_STATUSES, PROVISION_MEMBER_ROLE_CODES } from './constants';

const roleCodesField = Joi.array()
  .items(Joi.string().valid(...PROVISION_MEMBER_ROLE_CODES))
  .min(1);

const passwordField = Joi.string()
  .required()
  .custom((value, helpers) => {
    if (!passwordMeetsStrengthRules(value)) {
      return helpers.error('any.custom', { message: passwordStrengthErrorMessage() });
    }
    return value;
  }, 'password strength');

export const TenantAccessControlCreateSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(128).required(),
  username: Joi.string().trim().min(3).max(64).required(),
  password: passwordField,
  email: Joi.string().trim().email().allow('', null).optional(),
  phoneNumber: Joi.string().trim().max(32).allow('', null).optional(),
  title: Joi.string().trim().max(128).allow('', null).optional(),
  status: Joi.string()
    .valid(...MEMBER_STATUSES)
    .default('ACTIVE'),
  isPrimary: Joi.boolean().default(false),
  roleCodes: roleCodesField.required(),
  stationIds: Joi.array().items(Joi.string().uuid()).default([]),
});

export const TenantAccessControlUpdateSchema = Joi.object({
  title: Joi.string().trim().max(128).allow('', null),
  status: Joi.string().valid(...MEMBER_STATUSES),
  isPrimary: Joi.boolean(),
  roleCodes: roleCodesField,
  stationIds: Joi.array().items(Joi.string().uuid()),
}).min(1);
