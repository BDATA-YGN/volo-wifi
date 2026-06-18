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
    if (!orgId && meta?.memberships?.length === 1 && !meta?.requiresOrgSelection) {
      setOrgId(meta.memberships[0].id);
    }
  }, [meta?.memberships, meta?.requiresOrgSelection, orgId, setOrgId]);
}

export function useOrgIdState(meta?: WifiOrgScopeMeta | null) {
  const [orgId, setOrgId] = useState<string | undefined>();
  useSyncOrgIdFromMeta(meta, orgId, setOrgId);
  return [orgId, setOrgId] as const;
}

export function deriveWifiOrgScope(meta?: WifiOrgScopeMeta | null, orgId?: string) {
  const memberships = (meta?.memberships ?? []) as OrgMembershipOption[];
  const canSwitchOrg = Boolean(meta?.canSwitchOrg);
  const showOrgSwitcher = canSwitchOrg && memberships.length > 1;
  const needsOrg = Boolean(meta?.requiresOrgSelection) && !orgId;
  const contextReady = Boolean(orgId) && !needsOrg;

  return {
    memberships,
    canSwitchOrg,
    showOrgSwitcher,
    needsOrg,
    contextReady,
  };
}
