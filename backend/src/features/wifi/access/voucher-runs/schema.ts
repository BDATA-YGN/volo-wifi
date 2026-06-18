import Joi from 'joi';
import { MAX_BATCH_QUANTITY, MIN_BATCH_QUANTITY } from './constants';

const prefixPattern = /^[A-Z0-9]{2,12}$/;
const batchNoPattern = /^[A-Z0-9][A-Z0-9_-]{0,31}$/;

export const AccessVoucherRunsCreateSchema = Joi.object({
  planId: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(MIN_BATCH_QUANTITY).max(MAX_BATCH_QUANTITY).required(),
  batchNo: Joi.string().trim().uppercase().pattern(batchNoPattern).optional(),
  prefix: Joi.string()
    .trim()
    .uppercase()
    .pattern(prefixPattern)
    .message('Prefix must be 2–12 uppercase letters or digits')
    .allow('', null),
  note: Joi.string().trim().max(500).allow('', null),
  stationId: Joi.string().uuid().allow(null),
}).unknown(false);

export const AccessVoucherRunsUpdateSchema = Joi.object({
  note: Joi.string().trim().max(500).allow('', null),
})
  .min(1)
  .unknown(false);
