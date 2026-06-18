/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/catalog/service-plans';

export const PLAN_QUOTA_TYPES = ['TIME_ONLY', 'DATA_ONLY', 'TIME_AND_DATA'] as const;
export const UNIT_TIME_VALUES = ['MINUTE', 'HOUR', 'DAY'] as const;
export const PLAN_TIME_USAGE_MODES = ['CUMULATIVE_SESSIONS', 'SINGLE_SESSION'] as const;

export type PlanQuotaType = (typeof PLAN_QUOTA_TYPES)[number];
export type UnitTime = (typeof UNIT_TIME_VALUES)[number];
export type PlanTimeUsageMode = (typeof PLAN_TIME_USAGE_MODES)[number];
