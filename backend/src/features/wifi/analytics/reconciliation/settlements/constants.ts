/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/analytics/reconciliation/settlements';

export const PERIOD_PRESETS = ['7d', '30d', '90d'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const DEFAULT_PRESET: PeriodPreset = '30d';

export const SETTLEMENT_STATUSES = [
  'DRAFT',
  'DECLARED',
  'STATION_ATTESTED',
  'ORG_APPROVED',
  'REJECTED',
  'POSTED',
] as const;

export type SettlementStatusFilter = (typeof SETTLEMENT_STATUSES)[number];
