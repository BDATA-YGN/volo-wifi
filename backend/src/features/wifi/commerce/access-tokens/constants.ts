/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/commerce/access-tokens';

export const CREDENTIAL_STATUSES = [
  'SOLD',
  'ACTIVATED',
  'CONSUMED',
  'PAUSED',
  'REVOKED',
  'EXPIRED',
] as const;

/** Status values shown in console filters. */
export const CREDENTIAL_FILTER_STATUSES = [
  'SOLD',
  'ACTIVATED',
  'PAUSED',
  'EXPIRED',
  'REVOKED',
  'CONSUMED',
] as const;

export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

export const PAYMENT_METHODS = [
  'CASH',
  'BANK_TRANSFER',
  'MOBILE_MONEY',
  'CARD',
  'OTHER',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const MAX_ISSUE_QUANTITY = 20;
export const CAPTIVE_SESSION_PREVIEW_LIMIT = 20;
export const RADIUS_SESSION_PREVIEW_LIMIT = 20;
