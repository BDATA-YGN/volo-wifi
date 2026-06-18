import Joi from 'joi';

const paymentMethods = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'OTHER'] as const;
const invoiceStatuses = [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const;

export const BillingInvoicesRecordPaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string()
    .valid(...paymentMethods)
    .required(),
  paymentDate: Joi.date().iso().optional(),
  refNo: Joi.string().max(100).allow('', null).optional(),
  note: Joi.string().max(500).allow('', null).optional(),
}).unknown(false);

export const BillingInvoicesUpdateSchema = Joi.object({
  status: Joi.string()
    .valid(...invoiceStatuses)
    .optional(),
  notes: Joi.string().max(1000).allow('', null).optional(),
  issuedAt: Joi.date().iso().allow(null).optional(),
  dueDate: Joi.date().iso().optional(),
}).unknown(false);
