export const API_PATH = '/wifi/tenant/access-control';

export const MEMBER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DISABLED'] as const;

/**
 * Org membership role codes — aligned with console `mngRoles` in role-settings.json
 * (excluding platform ADMIN and super DEVELOPER).
 */
export const MEMBER_ROLE_CODES = [
  'ORG_VIEWER',
  'ORG_FINANCE',
  'STATION_OPS',
  'ORG_ADMIN',
  'PARTNER',
] as const;

/** Roles assignable via Access Control (partners are provisioned from the Partners menu). */
export const PROVISION_MEMBER_ROLE_CODES = [
  'ORG_VIEWER',
  'ORG_FINANCE',
  'STATION_OPS',
  'ORG_ADMIN',
] as const;

export type MemberRoleCode = (typeof MEMBER_ROLE_CODES)[number];
export type ProvisionMemberRoleCode = (typeof PROVISION_MEMBER_ROLE_CODES)[number];

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
