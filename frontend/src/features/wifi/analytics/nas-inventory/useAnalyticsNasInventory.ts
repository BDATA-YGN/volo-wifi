"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  DeviceType,
  NasInventoryData,
  NasInventoryFormOptions,
  NasInventoryMeta,
  NasInventoryParams,
} from "./types";

const emptyFormOptions: NasInventoryFormOptions = {
  memberships: [],
  stations: [],
};

export function useAnalyticsNasInventory() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  const [deviceType, setDeviceType] = useState<DeviceType | undefined>(undefined);
  const [isRadiusClient, setIsRadiusClient] = useState<boolean | undefined>(undefined);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [formOptions, setFormOptions] = useState<NasInventoryFormOptions>(emptyFormOptions);

  const params: NasInventoryParams = {
    orgId,
    stationId,
    type: deviceType,
    isRadiusClient,
    unassigned: unassignedOnly || undefined,
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadInventory(params), {
    refreshDeps: [orgId, stationId, deviceType, isRadiusClient, unassignedOnly],
  });

  const inventory = (data?.data ?? null) as NasInventoryData | null;
  const meta = (data?.meta ?? {}) as NasInventoryMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as NasInventoryFormOptions;
    setFormOptions(opts);
    if (!targetOrgId && opts.memberships.length === 1) {
      setOrgId(opts.memberships[0].id);
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setStationId(undefined);
      setDeviceType(undefined);
      setIsRadiusClient(undefined);
      setUnassignedOnly(false);
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const selectStation = useCallback((id: string | undefined) => {
    setStationId(id);
    setUnassignedOnly(false);
  }, []);

  const selectDeviceType = useCallback((value: DeviceType | undefined) => {
    setDeviceType(value);
  }, []);

  const selectRadiusClient = useCallback((value: boolean | undefined) => {
    setIsRadiusClient(value);
  }, []);

  const selectUnassignedOnly = useCallback((value: boolean) => {
    setUnassignedOnly(value);
    if (value) setStationId(undefined);
  }, []);

  const clearFilters = useCallback(() => {
    setStationId(undefined);
    setDeviceType(undefined);
    setIsRadiusClient(undefined);
    setUnassignedOnly(false);
  }, []);

  return {
    inventory,
    meta,
    loading,
    error,
    orgId,
    stationId,
    deviceType,
    isRadiusClient,
    unassignedOnly,
    formOptions,
    selectOrg,
    selectStation,
    selectDeviceType,
    selectRadiusClient,
    selectUnassignedOnly,
    clearFilters,
    refresh,
    loadFormOptions,
  };
}
