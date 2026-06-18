import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { MemberRoleCode } from "./types";

export const TENANT_ACCESS_CONTROL_API = buildWifiApiRoutes("/wifi/tenant/access-control");

export const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  DISABLED: "default",
};

/** Legacy codes stored before role catalog alignment. */
export const LEGACY_MEMBER_ROLE_ALIASES: Record<string, MemberRoleCode> = {
  ORG_OWNER: "ORG_ADMIN",
  STATION_MANAGER: "STATION_OPS",
  STATION_OPERATOR: "STATION_OPS",
  RESELLER_MANAGER: "PARTNER",
  FINANCE_CLERK: "ORG_FINANCE",
};

/** Aligned with console `mngRoles` in role-settings.json (excluding ADMIN and DEVELOPER). */
export const ROLE_OPTIONS: { value: MemberRoleCode; label: string; description: string }[] = [
  {
    value: "ORG_VIEWER",
    label: "Viewer",
    description: "Read-only tenant user — dashboard and analytics",
  },
  {
    value: "ORG_FINANCE",
    label: "Finance",
    description: "Tenant finance — subscription, invoices, reconciliation, and revenue analytics",
  },
  {
    value: "STATION_OPS",
    label: "Site operations",
    description: "Site operator — sites, network infrastructure, and site analytics",
  },
  {
    value: "ORG_ADMIN",
    label: "Admin",
    description:
      "Tenant administrator — members, catalog, sites, partners, and org configuration (no billing or subscription edits)",
  },
  {
    value: "PARTNER",
    label: "Partner",
    description: "Reseller partner — workspace, access tokens, transactions, and partner insights",
  },
];

/** Roles assignable from Access Control (partners are provisioned from the Partners menu). */
export const PROVISION_ROLE_OPTIONS = ROLE_OPTIONS.filter((option) => option.value !== "PARTNER");

const MEMBER_ROLE_CODE_SET = new Set<string>(ROLE_OPTIONS.map((option) => option.value));

export function normalizeMemberRoleCode(roleCode: string): MemberRoleCode | null {
  if (MEMBER_ROLE_CODE_SET.has(roleCode)) {
    return roleCode as MemberRoleCode;
  }
  return LEGACY_MEMBER_ROLE_ALIASES[roleCode] ?? null;
}

export function formatMemberRoleLabel(roleCode: string): string {
  const normalized = normalizeMemberRoleCode(roleCode) ?? roleCode;
  return ROLE_OPTIONS.find((option) => option.value === normalized)?.label ?? roleCode;
}
