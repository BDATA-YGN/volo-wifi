/** Map OLD console role names → NEW role names (role_id values differ by meaning). */
const OLD_ROLE_NAME_TO_NEW: Record<string, string> = {
  ADMIN: 'ADMIN',
  USER: 'ORG_VIEWER',
  DEVELOPER: 'DEVELOPER',
  REPORTERS: 'ORG_FINANCE',
  ORGANIZATION: 'ORG_ADMIN',
  RESELLER: 'PARTNER',
  WIFISTATION: 'STATION_OPS',
  // already-new names (if OLD was partially upgraded)
  ORG_VIEWER: 'ORG_VIEWER',
  ORG_FINANCE: 'ORG_FINANCE',
  STATION_OPS: 'STATION_OPS',
  ORG_ADMIN: 'ORG_ADMIN',
  PARTNER: 'PARTNER',
};

export function mapOldRoleNameToNew(oldRoleName: string | null | undefined): string {
  const key = (oldRoleName || '').trim().toUpperCase();
  return OLD_ROLE_NAME_TO_NEW[key] || 'ORG_VIEWER';
}

/** Org membership role codes used by the new WiFi access model. */
export const WIFI_ROLE = {
  ORG_ADMIN: 'ORG_ADMIN',
  STATION_OPS: 'STATION_OPS',
  PARTNER: 'PARTNER',
} as const;

export function stationScopeKey(stationId: string): string {
  return `station:${stationId}`;
}

export function resellerScopeKey(resellerId: string): string {
  return `reseller:${resellerId}`;
}
