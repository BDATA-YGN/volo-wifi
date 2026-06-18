/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/commerce/commissions/payouts';

export const PAYOUT_STATUSES = ['PENDING', 'APPROVED', 'PAID', 'REJECTED'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const TERMINAL_STATUSES: PayoutStatus[] = ['PAID', 'REJECTED'];

export const STATUS_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID', 'REJECTED'],
  PAID: [],
  REJECTED: [],
};
