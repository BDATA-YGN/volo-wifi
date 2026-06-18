"use client";

import { useCallback } from "react";
import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import type { WifiListParams } from "@/features/wifi/shared/types";
import * as BillingCapacityTiersQuery from "./query";
import type { CapacityTierFormValues, CapacityTierRecord, CapacityTiersMeta } from "./types";

export function useBillingCapacityTiers(initialParams: Partial<WifiListParams> = {}) {
  const { params, setParams, setPagination, setSearch, patchParams } = useWifiListState({
    limit: 50,
    ...initialParams,
  });

  const { data, loading, error, refresh } = useRequest(
    () => BillingCapacityTiersQuery.list(params),
    { refreshDeps: [params.page, params.limit, params.search] }
  );

  const list = ((data as CommonListResponse | undefined)?.data ?? []) as CapacityTierRecord[];
  const meta = (data as CommonListResponse | undefined)?.meta as CapacityTiersMeta | undefined;

  const createTier = useCallback(async (payload: CapacityTierFormValues) => {
    await BillingCapacityTiersQuery.create(payload);
    refresh();
  }, [refresh]);

  const updateTier = useCallback(
    async (id: string, payload: Partial<CapacityTierFormValues>) => {
      await BillingCapacityTiersQuery.update(id, payload);
      refresh();
    },
    [refresh]
  );

  const deleteTier = useCallback(
    async (id: string) => {
      await BillingCapacityTiersQuery.remove(id);
      refresh();
    },
    [refresh]
  );

  return {
    list,
    meta,
    loading,
    error,
    params,
    setParams,
    setPagination,
    setSearch,
    patchParams,
    refresh,
    createTier,
    updateTier,
    deleteTier,
  };
}
