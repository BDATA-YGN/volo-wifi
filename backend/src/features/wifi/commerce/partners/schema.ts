import Joi from 'joi';
import { USER_STATUSES } from './constants';

const codePattern = /^[A-Z0-9][A-Z0-9_-]{0,47}$/;
const createCodePattern = /^[A-Z0-9]{8}$/;

const planEntitlementItem = Joi.object({
  planId: Joi.string().uuid().required(),
  isEnabled: Joi.boolean().default(true),
});

const partnerFields = {
  code: Joi.string()
    .trim()
    .uppercase()
    .pattern(codePattern)
    .message('Code must use A-Z, 0-9, underscore, or hyphen'),
  name: Joi.string().trim().min(2).max(128),
  phone: Joi.string().trim().max(32).allow('', null),
  email: Joi.string().trim().email({ tlds: { allow: false } }).max(128).allow('', null),
  address: Joi.string().trim().max(500).allow('', null),
  status: Joi.string().valid(...USER_STATUSES),
  stationIds: Joi.array().items(Joi.string().uuid()).max(100),
  planEntitlements: Joi.array().items(planEntitlementItem).max(200),
};

export const CommercePartnersCreateSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .pattern(createCodePattern)
    .message('Code must be exactly 8 uppercase letters or digits')
    .required(),
  name: partnerFields.name.required(),
  phone: partnerFields.phone.optional(),
  email: partnerFields.email.optional(),
  address: partnerFields.address.optional(),
  status: partnerFields.status.default('ACTIVE'),
  stationIds: partnerFields.stationIds.default([]),
  planEntitlements: partnerFields.planEntitlements.default([]),
  loginUsername: Joi.string().trim().min(3).max(64).required(),
  loginPassword: Joi.string().min(8).required(),
}).unknown(false);

export const CommercePartnersUpdateSchema = Joi.object({
  code: partnerFields.code.optional(),
  name: partnerFields.name.optional(),
  phone: partnerFields.phone.optional(),
  email: partnerFields.email.optional(),
  address: partnerFields.address.optional(),
  status: partnerFields.status.optional(),
  stationIds: partnerFields.stationIds.optional(),
  planEntitlements: partnerFields.planEntitlements.optional(),
})
  .min(1)
  .unknown(false);
