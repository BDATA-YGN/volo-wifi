"use client";

import { useCallback } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  OrgSummary,
  TenantOverrideFormValues,
  TenantRateMatrixRow,
  TenantRatesMeta,
  TenantRatesOrgPayload,
} from "./types";

export function useBillingTierRatesTenant(orgId: string | null) {
  const orgsRequest = useRequest(() => Query.listOrgs(), { refreshDeps: [] });

  const ratesRequest = useRequest(
    () => (orgId ? Query.loadTenantRates(orgId) : Promise.resolve(null)),
    { refreshDeps: [orgId] }
  );

  const orgs = (orgsRequest.data?.data?.orgs ?? []) as OrgSummary[];
  const orgPayload = ratesRequest.data?.data as TenantRatesOrgPayload | undefined;
  const meta = (orgId ? ratesRequest.data?.meta : orgsRequest.data?.meta) as
    | TenantRatesMeta
    | undefined;

  const refresh = useCallback(() => {
    orgsRequest.refresh();
    if (orgId) ratesRequest.refresh();
  }, [orgId, orgsRequest, ratesRequest]);

  const createOverride = useCallback(
    async (values: TenantOverrideFormValues) => {
      await Query.create(values);
      ratesRequest.refresh();
      orgsRequest.refresh();
    },
    [ratesRequest, orgsRequest]
  );

  const updateOverride = useCallback(
    async (id: string, values: Partial<TenantOverrideFormValues>) => {
      await Query.update(id, values);
      ratesRequest.refresh();
    },
    [ratesRequest]
  );

  return {
    orgs,
    org: orgPayload?.org ?? null,
    matrix: (orgPayload?.matrix ?? []) as TenantRateMatrixRow[],
    history: orgPayload?.history ?? [],
    meta,
    loading: orgsRequest.loading || (Boolean(orgId) && ratesRequest.loading),
    orgsLoading: orgsRequest.loading,
    ratesLoading: ratesRequest.loading,
    error: orgsRequest.error || ratesRequest.error,
    refresh,
    createOverride,
    updateOverride,
  };
}
