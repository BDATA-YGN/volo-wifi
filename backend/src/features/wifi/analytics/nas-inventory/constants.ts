/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/analytics/nas-inventory';

export const DEVICE_TYPES = ['ROUTER', 'AP', 'CONTROLLER', 'SWITCH'] as const;
export type DeviceTypeFilter = (typeof DEVICE_TYPES)[number];
