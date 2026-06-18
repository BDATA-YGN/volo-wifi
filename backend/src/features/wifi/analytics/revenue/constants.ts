/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/analytics/revenue';

export const PERIOD_PRESETS = ['7d', '30d', '90d', '12m'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const DEFAULT_PRESET: PeriodPreset = '30d';

export const TREND_GRANULARITIES = ['daily', 'monthly', 'yearly'] as const;
export type TrendGranularity = (typeof TREND_GRANULARITIES)[number];
