/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/analytics/site-inventory';

export const STATION_STATUSES = ['ACTIVE', 'MAINTENANCE', 'DISABLED'] as const;
export type StationStatusFilter = (typeof STATION_STATUSES)[number];

export const DEVICE_TYPES = ['ROUTER', 'AP', 'CONTROLLER', 'SWITCH'] as const;
export type DeviceTypeFilter = (typeof DEVICE_TYPES)[number];
