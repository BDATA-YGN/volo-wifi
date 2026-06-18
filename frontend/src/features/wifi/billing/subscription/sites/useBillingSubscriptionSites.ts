"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  LicensedSitesDetailPayload,
  LicensedSitesMeta,
  LicensedSitesOrgSummary,
  LicensedSitesQueryParams,
} from "./types";

export function useBillingSubscriptionSites(orgId: string | null) {
  const [filters, setFilters] = useState<Omit<LicensedSitesQueryParams, "orgId">>({
    billableOnly: true,
  });

  const orgsRequest = useRequest(() => Query.listLicensedSitesOrgs(), {
    refreshDeps: [],
  });

  const detailRequest = useRequest(
    () =>
      orgId
        ? Query.loadLicensedSites({ orgId, ...filters })
        : Promise.resolve(null),
    { refreshDeps: [orgId, filters.search, filters.tierCode, filters.billableOnly] }
  );

  const orgs = (orgsRequest.data?.data?.orgs ?? []) as LicensedSitesOrgSummary[];
  const listMeta = orgsRequest.data?.meta as LicensedSitesMeta | undefined;
  const detail = detailRequest.data?.data as LicensedSitesDetailPayload | undefined;
  const detailMeta = detailRequest.data?.meta as LicensedSitesMeta | undefined;

  const refresh = useCallback(() => {
    orgsRequest.refresh();
    if (orgId) detailRequest.refresh();
  }, [orgId, orgsRequest, detailRequest]);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  }, []);

  const setTierCode = useCallback((tierCode: string | null) => {
    setFilters((prev) => ({ ...prev, tierCode: tierCode || undefined }));
  }, []);

  const setBillableOnly = useCallback((billableOnly: boolean) => {
    setFilters((prev) => ({ ...prev, billableOnly }));
  }, []);

  return {
    orgs,
    listMeta,
    detail,
    detailMeta,
    filters,
    loading: orgsRequest.loading || (Boolean(orgId) && detailRequest.loading),
    orgsLoading: orgsRequest.loading,
    detailLoading: detailRequest.loading,
    error: orgsRequest.error || detailRequest.error,
    refresh,
    setSearch,
    setTierCode,
    setBillableOnly,
  };
}
