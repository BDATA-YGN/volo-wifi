/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/commerce/commissions/rules';

export const COMMISSION_TYPES = ['PERCENT', 'FIXED'] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];

export const MAX_PERCENT = 1;
export const MAX_FIXED_AMOUNT = 999_999_999;
