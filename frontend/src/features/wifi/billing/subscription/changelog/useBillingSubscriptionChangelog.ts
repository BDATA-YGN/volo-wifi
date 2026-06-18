"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  ChangelogDetailPayload,
  ChangelogMeta,
  ChangelogOrgSummary,
  ChangelogQueryParams,
  LicenseChangeType,
} from "./types";

export function useBillingSubscriptionChangelog(orgId: string | null) {
  const [filters, setFilters] = useState<Omit<ChangelogQueryParams, "orgId">>({
    page: 1,
    limit: 20,
  });

  const orgsRequest = useRequest(() => Query.listChangelogOrgs(), {
    refreshDeps: [],
  });

  const detailRequest = useRequest(
    () =>
      orgId
        ? Query.loadChangelog({ orgId, ...filters })
        : Promise.resolve(null),
    {
      refreshDeps: [
        orgId,
        filters.search,
        filters.changeType,
        filters.tierCode,
        filters.page,
        filters.limit,
      ],
    }
  );

  const orgs = (orgsRequest.data?.data?.orgs ?? []) as ChangelogOrgSummary[];
  const listMeta = orgsRequest.data?.meta as ChangelogMeta | undefined;
  const detail = detailRequest.data?.data as ChangelogDetailPayload | undefined;
  const detailMeta = detailRequest.data?.meta as ChangelogMeta | undefined;

  const refresh = useCallback(() => {
    orgsRequest.refresh();
    if (orgId) detailRequest.refresh();
  }, [orgId, orgsRequest, detailRequest]);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  }, []);

  const setChangeType = useCallback((changeType: LicenseChangeType | null) => {
    setFilters((prev) => ({ ...prev, changeType: changeType || undefined, page: 1 }));
  }, []);

  const setTierCode = useCallback((tierCode: string | null) => {
    setFilters((prev) => ({ ...prev, tierCode: tierCode || undefined, page: 1 }));
  }, []);

  const setPagination = useCallback((page: number, limit?: number) => {
    setFilters((prev) => {
      if (limit !== undefined && limit !== prev.limit) {
        return { ...prev, page: 1, limit };
      }
      return { ...prev, page };
    });
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
    setChangeType,
    setTierCode,
    setPagination,
  };
}
