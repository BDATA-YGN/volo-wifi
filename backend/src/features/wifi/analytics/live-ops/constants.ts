/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/analytics/live-ops';

export const WINDOW_HOURS_OPTIONS = [1, 6, 24] as const;
export type WindowHours = (typeof WINDOW_HOURS_OPTIONS)[number];

export const DEFAULT_WINDOW_HOURS: WindowHours = 24;

/** Active session with no interim update beyond this is flagged as stalled */
export const STALLED_SESSION_MINUTES = 30;
