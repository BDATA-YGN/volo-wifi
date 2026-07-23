"use client";

import { useCallback } from "react";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import { useNetworkOrgListState } from "@/features/wifi/network/shared/useNetworkOrgListState";
import * as Query from "./query";
import type {
  PlanPoliciesFormOptions,
  PlanPoliciesListParams,
  PlanPoliciesMeta,
  PlanPolicyFormValues,
  PlanPolicyGroupRecord,
} from "./types";

export function useNetworkRadiusPlanPolicies(initialParams: Partial<PlanPoliciesListParams> = {}) {
  const { params, setParams, setPagination, setSearch, patchParams } = useWifiListState({
    limit: 20,
    ...initialParams,
  });

  const extended = params as PlanPoliciesListParams;

  const listState = useNetworkOrgListState<
    PlanPoliciesListParams,
    PlanPolicyGroupRecord,
    PlanPoliciesMeta
  >(
    extended,
    patchParams,
    Query.list,
    [
      extended.page,
      extended.limit,
      extended.search,
      extended.planId,
      extended.vendorProfileId,
      extended.phase,
      extended.globalOnly,
    ]
  );

  const { orgId, refresh } = listState;

  const loadFormOptions = useCallback(
    async (targetOrgId?: string) => {
      const res = await Query.loadFormOptions(targetOrgId ?? orgId);
      return res.data as PlanPoliciesFormOptions;
    },
    [orgId]
  );

  const savePolicyGroup = useCallback(
    async (payload: PlanPolicyFormValues) => {
      await Query.saveGroup({ ...payload, orgId: payload.orgId || orgId! }, orgId);
      try {
        await refresh();
      } catch {
        // Mutation succeeded; refresh is best-effort.
      }
    },
    [orgId, refresh]
  );

  const deletePolicyGroup = useCallback(
    async (group: PlanPolicyGroupRecord) => {
      await Query.removeGroup({ policyBundleId: group.policyBundleId || group.groupKey }, orgId);
      try {
        await refresh();
      } catch {
        // Mutation succeeded; refresh is best-effort.
      }
    },
    [orgId, refresh]
  );

  return {
    ...listState,
    setParams,
    setPagination,
    setSearch,
    patchParams,
    loadFormOptions,
    savePolicyGroup,
    deletePolicyGroup,
  };
}
