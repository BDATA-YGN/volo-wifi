/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/commerce/partners';

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DISABLED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
