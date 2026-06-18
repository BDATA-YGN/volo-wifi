/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/commerce/partners/insights';

export const PERIOD_PRESETS = ['7d', '30d', '90d'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const DEFAULT_PRESET: PeriodPreset = '30d';
