/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/tenant/activity-log';

/** Common audit actions — extend as writers are added across the platform */
export const KNOWN_AUDIT_ACTIONS = [
  'TENANT_REGISTERED',
  'MEMBER_CREATED',
  'MEMBER_LINKED',
  'MEMBER_UPDATED',
  'MEMBER_REMOVED',
  'ORG_PROFILE_UPDATED',
  'LICENSE_UPDATED',
  'STATION_CREATED',
  'STATION_UPDATED',
  'PLAN_CREATED',
  'PLAN_UPDATED',
] as const;
