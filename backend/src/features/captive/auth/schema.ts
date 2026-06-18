import { CredentialType } from '@/generated/prisma/client';
import Joi from 'joi';

export const CaptiveLoginSchema = Joi.object({
  type: Joi.valid(...Object.values(CredentialType)).required(),
  token: Joi.string().when('type', {
    is: CredentialType.VOUCHER_TOKEN,
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  username: Joi.string().when('type', {
    is: CredentialType.USER_PASSWORD,
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  password: Joi.string().when('type', {
    is: CredentialType.USER_PASSWORD,
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  nasParams: Joi.object().optional(),
});

export const CaptiveSessionSchema = Joi.object({
  nasParams: Joi.object().required(),
});
