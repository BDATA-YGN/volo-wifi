"use client";

import { useCallback, useRef, useState } from "react";
import { useRequest } from "ahooks";
import {
  filterBySiteAllowList,
  sessionStationAllowList,
  singleMembershipOrgId,
} from "@/features/wifi/shared/site-allow-list";
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
  const formOptionsSeq = useRef(0);

  const params: NasInventoryParams = {
    orgId,
    stationId,
    type: deviceType,
    isRadiusClient,
    unassigned: unassignedOnly || undefined,
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadInventory(params), {
    ready: Boolean(orgId),
    refreshDeps: [orgId, stationId, deviceType, isRadiusClient, unassignedOnly],
  });

  const inventory = (data?.data ?? null) as NasInventoryData | null;
  const meta = (data?.meta ?? {}) as NasInventoryMeta;

  const applyOrgFormOptions = useCallback((opts: NasInventoryFormOptions, scopedOrgId: string) => {
    setFormOptions({
      ...opts,
      memberships: opts.memberships ?? [],
      stations: filterBySiteAllowList(opts.stations ?? [], sessionStationAllowList(scopedOrgId)),
    });
  }, []);

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const seq = ++formOptionsSeq.current;
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as NasInventoryFormOptions;
    if (seq !== formOptionsSeq.current) return opts;

    const onlyOrgId = singleMembershipOrgId(opts, targetOrgId);
    if (onlyOrgId) {
      setOrgId(onlyOrgId);
      const scoped = await Query.loadFormOptions(onlyOrgId);
      if (seq !== formOptionsSeq.current) return scoped.data as NasInventoryFormOptions;
      const scopedOpts = scoped.data as NasInventoryFormOptions;
      applyOrgFormOptions(scopedOpts, onlyOrgId);
      return scopedOpts;
    }

    if (!targetOrgId) {
      setFormOptions((prev) => ({
        ...prev,
        memberships: opts.memberships ?? prev.memberships,
      }));
      return opts;
    }

    applyOrgFormOptions(opts, targetOrgId);
    return opts;
  }, [applyOrgFormOptions]);

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
