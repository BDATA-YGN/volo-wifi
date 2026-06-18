/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/sites';

export const STATION_STATUSES = ['ACTIVE', 'MAINTENANCE', 'DISABLED'] as const;
export type StationStatus = (typeof STATION_STATUSES)[number];
