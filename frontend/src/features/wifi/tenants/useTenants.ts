"use client";

import { useCallback } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import * as Query from "./query";
import type { TenantDetailRecord, TenantEditFormValues, TenantRecord, TenantsListParams, TenantsMeta } from "./types";

export function useTenants(initialParams: Partial<TenantsListParams> = {}) {
  const { params, setParams, setPagination, setSearch } = useWifiListState({
    limit: 20,
    ...initialParams,
  });

  const patchParams = useCallback((patch: Partial<TenantsListParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, [setParams]);

  const extended = params as TenantsListParams;

  const { data, loading, error, refresh } = useRequest(() => Query.list(extended), {
    refreshDeps: [
      extended.page,
      extended.limit,
      extended.search,
      extended.isActive,
      extended.licenseStatus,
      extended.hasLicense,
    ],
  });

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as TenantRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as TenantsMeta | undefined;

  const loadTenant = useCallback(async (id: string) => {
    const res = await Query.getById(id);
    return {
      tenant: res.data as TenantDetailRecord,
      meta: res.meta as TenantsMeta | undefined,
    };
  }, []);

  const updateTenant = useCallback(
    async (id: string, payload: TenantEditFormValues) => {
      await Query.update(id, payload);
      refresh();
    },
    [refresh]
  );

  return {
    list,
    meta,
    loading,
    error,
    params: extended,
    setParams,
    setPagination,
    setSearch,
    patchParams,
    refresh,
    loadTenant,
    updateTenant,
  };
}
