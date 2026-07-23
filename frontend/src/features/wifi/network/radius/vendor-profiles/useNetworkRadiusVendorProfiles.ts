"use client";

import { useCallback } from "react";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import { useNetworkOrgListState } from "@/features/wifi/network/shared/useNetworkOrgListState";
import type { WifiListParams } from "@/features/wifi/shared/types";
import * as Query from "./query";
import type {
  CatalogAttribute,
  VendorProfileFormValues,
  VendorProfileRecord,
  VendorProfilesMeta,
} from "./types";

export function useNetworkRadiusVendorProfiles(initialParams: Partial<WifiListParams> = {}) {
  const { params, setParams, setPagination, setSearch, patchParams } = useWifiListState({
    limit: 20,
    ...initialParams,
  });

  const listState = useNetworkOrgListState<
    WifiListParams,
    VendorProfileRecord,
    VendorProfilesMeta
  >(params, patchParams, Query.list, [params.page, params.limit, params.search]);

  const { refresh } = listState;

  const loadCatalog = useCallback(async () => {
    const res = await Query.loadCatalog(listState.orgId);
    return res.data.attributes as CatalogAttribute[];
  }, [listState.orgId]);

  const loadProfile = useCallback(
    async (id: string) => {
      const res = await Query.getById(id, listState.orgId);
      return res.data as VendorProfileRecord;
    },
    [listState.orgId]
  );

  const createProfile = useCallback(
    async (payload: VendorProfileFormValues) => {
      await Query.create(payload, listState.orgId);
      try {
        await refresh();
      } catch {
        // Mutation already succeeded; list refresh is best-effort.
      }
    },
    [listState.orgId, refresh]
  );

  const updateProfile = useCallback(
    async (id: string, payload: Partial<VendorProfileFormValues>) => {
      await Query.update(id, payload, listState.orgId);
      try {
        await refresh();
      } catch {
        // Mutation already succeeded; list refresh is best-effort.
      }
    },
    [listState.orgId, refresh]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await Query.remove(id, listState.orgId);
      try {
        await refresh();
      } catch {
        // Mutation already succeeded; list refresh is best-effort.
      }
    },
    [listState.orgId, refresh]
  );

  return {
    ...listState,
    setParams,
    setPagination,
    setSearch,
    patchParams,
    loadCatalog,
    loadProfile,
    createProfile,
    updateProfile,
    deleteProfile,
  };
}
