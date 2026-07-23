"use client";

import { useEffect, useState } from "react";
import type { OrgMembershipOption } from "@/features/wifi/tenant/profile/types";
import type { WifiOrgScopeMeta } from "../types";

export function useSyncOrgIdFromMeta(
  meta: WifiOrgScopeMeta | undefined | null,
  orgId: string | undefined,
  setOrgId: (id: string) => void
) {
  useEffect(() => {
    if (meta?.orgId && !orgId) {
      setOrgId(meta.orgId);
    }
  }, [meta?.orgId, orgId, setOrgId]);

  useEffect(() => {
    // Developers must pick explicitly — never auto-select for requiresOrgSelection.
    if (meta?.requiresOrgSelection) return;
    if (!orgId && meta?.memberships?.length === 1) {
      setOrgId(meta.memberships[0].id);
    }
  }, [meta?.memberships, meta?.requiresOrgSelection, orgId, setOrgId]);
}

export function useOrgIdState(meta?: WifiOrgScopeMeta | null) {
  const [orgId, setOrgId] = useState<string | undefined>();
  useSyncOrgIdFromMeta(meta, orgId, setOrgId);
  return [orgId, setOrgId] as const;
}

/** Show org picker for developers (canSwitchOrg / requiresOrgSelection) or multi-membership users. */
export function shouldShowOrgSwitcher(
  memberships: OrgMembershipOption[],
  meta?: Pick<WifiOrgScopeMeta, "canSwitchOrg" | "requiresOrgSelection"> | null
): boolean {
  if (memberships.length === 0) return false;
  if (meta?.canSwitchOrg || meta?.requiresOrgSelection) return true;
  return memberships.length > 1;
}

export function needsOrgSelection(
  orgId: string | undefined,
  meta?: Pick<WifiOrgScopeMeta, "canSwitchOrg" | "requiresOrgSelection"> | null,
  membershipsLength = 0
): boolean {
  if (orgId) return false;
  if (meta?.requiresOrgSelection || meta?.canSwitchOrg) return membershipsLength > 0;
  return membershipsLength > 1;
}

export function deriveWifiOrgScope(meta?: WifiOrgScopeMeta | null, orgId?: string) {
  const memberships = (meta?.memberships ?? []) as OrgMembershipOption[];
  const canSwitchOrg = Boolean(meta?.canSwitchOrg);
  const showOrgSwitcher = shouldShowOrgSwitcher(memberships, meta);
  const needsOrg = needsOrgSelection(orgId, meta, memberships.length);
  const contextReady = Boolean(orgId) && !needsOrg;

  return {
    memberships,
    canSwitchOrg,
    showOrgSwitcher,
    needsOrg,
    contextReady,
  };
}
