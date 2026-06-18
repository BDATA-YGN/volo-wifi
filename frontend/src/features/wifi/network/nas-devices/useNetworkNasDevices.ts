"use client";

import { useCallback } from "react";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import { useNetworkOrgListState } from "@/features/wifi/network/shared/useNetworkOrgListState";
import * as Query from "./query";
import type {
  DeviceType,
  NasDeviceFormValues,
  NasDeviceRecord,
  NasDevicesFormOptions,
  NasDevicesMeta,
} from "./types";

type ExtendedParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  type?: DeviceType;
  isRadiusClient?: boolean;
  unassigned?: boolean;
};

export function useNetworkNasDevices(initialParams: Partial<ExtendedParams> = {}) {
  const { params, setParams, setPagination, setSearch, patchParams } = useWifiListState({
    limit: 20,
    ...initialParams,
  });

  const extendedParams = params as ExtendedParams;
  const listState = useNetworkOrgListState<ExtendedParams, NasDeviceRecord, NasDevicesMeta>(
    extendedParams,
    patchParams,
    Query.list,
    [
      extendedParams.page,
      extendedParams.limit,
      extendedParams.search,
      extendedParams.type,
      extendedParams.isRadiusClient,
      extendedParams.unassigned,
    ]
  );

  const { orgId, refresh } = listState;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId ?? orgId);
    return res.data as NasDevicesFormOptions;
  }, [orgId]);

  const createDevice = useCallback(
    async (payload: NasDeviceFormValues) => {
      await Query.create({ ...payload, orgId: payload.orgId || orgId! }, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const updateDevice = useCallback(
    async (id: string, payload: Partial<NasDeviceFormValues>) => {
      await Query.update(id, payload, orgId);
      refresh();
    },
    [orgId, refresh]
  );

  const deleteDevice = useCallback(
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
    createDevice,
    updateDevice,
    deleteDevice,
  };
}
