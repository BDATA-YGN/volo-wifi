import Joi from 'joi';

export const LoginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
  /** Optional browser client IP from Next.js server actions (/wifi, /partner). */
  clientIp: Joi.string()
    .ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' })
    .optional()
    .allow(null, ''),
});

export const LogoutSchema = Joi.object({
  token: Joi.string().required()
});

export const ChangePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).max(128).required(),
  newPassword: Joi.string().min(8).max(128).required(),
}).unknown(false);

