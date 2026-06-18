/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/commerce/transactions/payments';

export const PAYMENT_METHODS = [
  'CASH',
  'BANK_TRANSFER',
  'MOBILE_MONEY',
  'CARD',
  'OTHER',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SALE_STATUSES = ['DRAFT', 'PAID', 'VOID', 'REFUNDED'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];
