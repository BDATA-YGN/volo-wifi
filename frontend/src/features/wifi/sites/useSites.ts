"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import * as Query from "./query";
import type {
  SiteFormValues,
  SiteRecord,
  SitesFormOptions,
  SitesListParams,
  SitesMeta,
} from "./types";

const emptyFormOptions: SitesFormOptions = {
  memberships: [],
  stationSizes: [],
  vendorProfiles: [],
};

export function useSites() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<SitesFormOptions>(emptyFormOptions);

  const { params, setParams, setPagination, setSearch } = useWifiListState({ limit: 20 });
  const patchParams = useCallback((patch: Partial<SitesListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = { ...(params as SitesListParams), orgId };

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.orgId,
      extended.status,
      extended.stationSizeId,
      extended.township,
    ],
    ready: Boolean(orgId),
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as SiteRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as SitesMeta | undefined;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as SitesFormOptions;
    setFormOptions(opts);
    // Vendor profiles are org-scoped; without orgId the API returns []. Hydrate when
    // there is a single membership (same pattern as commerce partners / retail pricing).
    if (!targetOrgId && opts.memberships.length === 1) {
      const onlyOrgId = opts.memberships[0].id;
      setOrgId(onlyOrgId);
      const withOrg = await Query.loadFormOptions(onlyOrgId);
      const hydrated = withOrg.data as SitesFormOptions;
      setFormOptions(hydrated);
      return hydrated;
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setParams((prev) => ({ ...prev, page: 1 }));
      void loadFormOptions(id);
    },
    [loadFormOptions, setParams]
  );

  const loadSite = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, orgId);
      return res.data as SiteRecord;
    },
    [orgId]
  );

  const createSite = useCallback(
    async (payload: SiteFormValues) => {
      await Query.create(payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const updateSite = useCallback(
    async (id: string, payload: Partial<SiteFormValues>) => {
      await Query.update(id, payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const removeSite = useCallback(
    async (id: string) => {
      await Query.remove(id, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  return {
    list,
    meta,
    loading,
    error,
    params: extended,
    orgId,
    formOptions,
    setPagination,
    setSearch,
    patchParams,
    selectOrg,
    refresh,
    loadFormOptions,
    loadSite,
    createSite,
    updateSite,
    removeSite,
  };
}
