/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/analytics/revenue';

export const TREND_GRANULARITIES = ['daily'] as const;
export type TrendGranularity = (typeof TREND_GRANULARITIES)[number];
