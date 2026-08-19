/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/analytics/reconciliation/coverage';

export const ELIGIBILITY_STATUSES = ['SEALED', 'GAP', 'UNSEALED', 'NO_COVERAGE'] as const;
export type EligibilityStatus = (typeof ELIGIBILITY_STATUSES)[number];

export const LAG_BUCKETS = [
  'Fully sealed',
  '1–7 day gap',
  '8–30 day gap',
  '31–90 day gap',
  '90+ day gap',
  'Unsealed posting',
  'No coverage record',
] as const;
export type LagBucket = (typeof LAG_BUCKETS)[number];
