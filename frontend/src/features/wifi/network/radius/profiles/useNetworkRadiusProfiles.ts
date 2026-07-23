"use client";

import { useCallback } from "react";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import { useNetworkOrgListState } from "@/features/wifi/network/shared/useNetworkOrgListState";
import type { WifiListParams } from "@/features/wifi/shared/types";
import * as Query from "./query";
import type { RadiusProfileFormValues, RadiusProfileMeta, RadiusProfileRecord } from "./types";

type ExtendedParams = WifiListParams & { isActive?: boolean; orgId?: string };

export function useNetworkRadiusProfiles(initialParams: Partial<ExtendedParams> = {}) {
  const { params, setParams, setPagination, setSearch, patchParams } = useWifiListState({
    limit: 20,
    ...initialParams,
  });

  const extended = params as ExtendedParams;

  const listState = useNetworkOrgListState<ExtendedParams, RadiusProfileRecord, RadiusProfileMeta>(
    extended,
    patchParams,
    Query.list,
    [extended.page, extended.limit, extended.search, extended.isActive]
  );

  const { refresh } = listState;

  const createProfile = useCallback(
    async (payload: RadiusProfileFormValues) => {
      await Query.create(payload, listState.orgId);
      refresh();
    },
    [listState.orgId, refresh]
  );

  const updateProfile = useCallback(
    async (id: string, payload: Partial<RadiusProfileFormValues>) => {
      await Query.update(id, payload, listState.orgId);
      refresh();
    },
    [listState.orgId, refresh]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await Query.remove(id, listState.orgId);
      refresh();
    },
    [listState.orgId, refresh]
  );

  return {
    ...listState,
    setParams,
    setPagination,
    setSearch,
    patchParams,
    createProfile,
    updateProfile,
    deleteProfile,
  };
}
