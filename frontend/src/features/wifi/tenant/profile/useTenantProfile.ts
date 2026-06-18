"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type { OrgMembershipOption, TenantProfile, TenantProfileFormValues, TenantProfileMeta } from "./types";

export function useTenantProfile() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);

  const { data, loading, error, refresh } = useRequest(() => Query.loadProfile(orgId), {
    refreshDeps: [orgId],
  });

  const profile = (data?.data ?? null) as TenantProfile | null;
  const meta = data?.meta as TenantProfileMeta | undefined;
  const requiresSelection = Boolean(meta?.requiresOrgSelection);

  const selectOrg = useCallback((id: string) => {
    setOrgId(id);
  }, []);

  const updateProfile = useCallback(
    async (payload: TenantProfileFormValues) => {
      const resolvedOrgId = orgId ?? profile?.id;
      await Query.updateProfile(payload, resolvedOrgId);
      refresh();
    },
    [orgId, profile?.id, refresh]
  );

  const loadMemberships = useCallback(async () => {
    const res = await Query.loadMemberships();
    return res.data.memberships as OrgMembershipOption[];
  }, []);

  return {
    profile,
    meta,
    loading,
    error,
    requiresSelection,
    orgId: orgId ?? profile?.id,
    selectOrg,
    refresh,
    updateProfile,
    loadMemberships,
  };
}
