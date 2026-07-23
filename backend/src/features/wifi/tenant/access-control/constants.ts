export const API_PATH = '/wifi/tenant/access-control';

export const MEMBER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DISABLED'] as const;

/**
 * Org membership role codes — aligned with console `mngRoles` in role-settings.json.
 * Platform ADMIN / DEVELOPER are never org-member roles.
 */
export const MEMBER_ROLE_CODES = [
  'ORG_VIEWER',
  'ORG_FINANCE',
  'STATION_OPS',
  'ORG_ADMIN',
  'PARTNER',
] as const;

/**
 * Roles assignable via Access Control member form.
 * Excluded: PARTNER (Partners menu) and platform ADMIN/DEVELOPER.
 */
export const PROVISION_MEMBER_ROLE_CODES = [
  'ORG_VIEWER',
  'ORG_FINANCE',
  'STATION_OPS',
  'ORG_ADMIN',
] as const;

/** Roles the Access Control form must not add/remove. */
export const LOCKED_MEMBER_ROLE_CODES = ['PARTNER'] as const;

/** Prefer highest-privilege console role when provisioning Admin.roleId. */
export const CONSOLE_ROLE_PRIORITY = [
  'ORG_ADMIN',
  'STATION_OPS',
  'ORG_FINANCE',
  'ORG_VIEWER',
] as const;

export type MemberRoleCode = (typeof MEMBER_ROLE_CODES)[number];
export type ProvisionMemberRoleCode = (typeof PROVISION_MEMBER_ROLE_CODES)[number];
export type LockedMemberRoleCode = (typeof LOCKED_MEMBER_ROLE_CODES)[number];

/** Legacy codes stored before role catalog alignment. */
export const LEGACY_MEMBER_ROLE_ALIASES: Record<string, MemberRoleCode> = {
  ORG_OWNER: 'ORG_ADMIN',
  STATION_MANAGER: 'STATION_OPS',
  STATION_OPERATOR: 'STATION_OPS',
  RESELLER_MANAGER: 'PARTNER',
  FINANCE_CLERK: 'ORG_FINANCE',
};

export function normalizeMemberRoleCode(roleCode: string): MemberRoleCode | string {
  if ((MEMBER_ROLE_CODES as readonly string[]).includes(roleCode)) {
    return roleCode as MemberRoleCode;
  }
  return LEGACY_MEMBER_ROLE_ALIASES[roleCode] ?? roleCode;
}

export function isLockedMemberRoleCode(roleCode: string): boolean {
  const normalized = normalizeMemberRoleCode(roleCode);
  return (LOCKED_MEMBER_ROLE_CODES as readonly string[]).includes(normalized);
}

export function pickConsoleRoleName(roleCodes: string[]): string {
  const set = new Set(roleCodes.map((c) => normalizeMemberRoleCode(c)));
  for (const code of CONSOLE_ROLE_PRIORITY) {
    if (set.has(code)) return code;
  }
  return 'ORG_VIEWER';
}
