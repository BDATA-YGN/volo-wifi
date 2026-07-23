/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/analytics/reconciliation/coverage';

export const ELIGIBILITY_STATUSES = ['SEALED', 'GAP', 'UNSEALED', 'NO_COVERAGE'] as const;
export type EligibilityStatus = (typeof ELIGIBILITY_STATUSES)[number];
