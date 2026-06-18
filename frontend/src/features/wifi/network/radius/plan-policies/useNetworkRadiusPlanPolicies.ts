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
  PlanPolicyRecord,
} from "./types";

export function useNetworkRadiusPlanPolicies(initialParams: Partial<PlanPoliciesListParams> = {}) {
  const { params, setParams, setPagination, setSearch, patchParams } = useWifiListState({
    limit: 20,
    ...initialParams,
  });

  const extended = params as PlanPoliciesListParams;

  const listState = useNetworkOrgListState<
    PlanPoliciesListParams,
    PlanPolicyRecord,
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

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId ?? orgId);
    return res.data as PlanPoliciesFormOptions;
  }, [orgId]);

  const createPolicy = useCallback(
    async (payload: PlanPolicyFormValues) => {
      await Query.create({ ...payload, orgId: payload.orgId || orgId! }, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const updatePolicy = useCallback(
    async (id: string, payload: Partial<PlanPolicyFormValues>) => {
      await Query.update(id, payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const deletePolicy = useCallback(
    async (id: string) => {
      await Query.remove(id, orgId);
      refresh();
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
    createPolicy,
    updatePolicy,
    deletePolicy,
  };
}
