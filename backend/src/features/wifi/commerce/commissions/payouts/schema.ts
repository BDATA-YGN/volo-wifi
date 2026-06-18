import Joi from 'joi';
import { PAYOUT_STATUSES } from './constants';

const isoDate = Joi.date().iso();

export const CommerceCommissionsPayoutsCreateSchema = Joi.object({
  resellerId: Joi.string().uuid().required(),
  periodFrom: isoDate.required(),
  periodTo: isoDate.required(),
  amount: Joi.number().min(0).optional(),
  generate: Joi.boolean().default(true),
  note: Joi.string().max(500).allow('', null).optional(),
})
  .custom((value, helpers) => {
    const from = new Date(value.periodFrom);
    const to = new Date(value.periodTo);
    if (from > to) {
      return helpers.error('any.custom', {
        message: 'Period end must be on or after period start.',
      });
    }
    if (!value.generate && (value.amount === undefined || value.amount === null)) {
      return helpers.error('any.custom', {
        message: 'Amount is required when not auto-generating from sales.',
      });
    }
    return value;
  })
  .unknown(false);

export const CommerceCommissionsPayoutsUpdateSchema = Joi.object({
  status: Joi.string()
    .valid(...PAYOUT_STATUSES)
    .optional(),
  note: Joi.string().max(500).allow('', null).optional(),
  paidAt: isoDate.optional(),
})
  .min(1)
  .unknown(false);

export const CommerceCommissionsPayoutsPreviewSchema = Joi.object({
  resellerId: Joi.string().uuid().required(),
  periodFrom: isoDate.required(),
  periodTo: isoDate.required(),
}).unknown(false);
