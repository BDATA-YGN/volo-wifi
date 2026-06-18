import Joi from 'joi';
import { AUTH_PASSWORD_MAX_LENGTH, AUTH_USERNAME_MAX_LENGTH } from './auth.constants';

const passwordField = Joi.string().min(1).max(AUTH_PASSWORD_MAX_LENGTH).required();

export const MobileAuthLoginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(AUTH_USERNAME_MAX_LENGTH).required(),
  password: passwordField,
}).unknown(false);

export const MobileAuthChangePasswordSchema = Joi.object({
  currentPassword: passwordField,
  newPassword: Joi.string().min(8).max(AUTH_PASSWORD_MAX_LENGTH).required(),
}).unknown(false);

export const MobileAuthRefreshSchema = Joi.object({
  refreshToken: Joi.string().trim().min(20).max(2048).optional(),
}).unknown(false);
