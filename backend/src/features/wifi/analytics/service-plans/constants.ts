/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/analytics/service-plans';

export const PERIOD_PRESETS = ['7d', '30d', '90d'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const DEFAULT_PRESET: PeriodPreset = '30d';

export const PLAN_QUOTA_TYPES = ['TIME_ONLY', 'DATA_ONLY', 'TIME_AND_DATA'] as const;
export type PlanQuotaTypeFilter = (typeof PLAN_QUOTA_TYPES)[number];
