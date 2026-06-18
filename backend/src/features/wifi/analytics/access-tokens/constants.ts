/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/analytics/access-tokens';

export const PERIOD_PRESETS = ['7d', '30d', '90d'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const DEFAULT_PRESET: PeriodPreset = '30d';

export const CREDENTIAL_TYPES = ['VOUCHER_TOKEN', 'USER_PASSWORD'] as const;
export type CredentialTypeFilter = (typeof CREDENTIAL_TYPES)[number];
