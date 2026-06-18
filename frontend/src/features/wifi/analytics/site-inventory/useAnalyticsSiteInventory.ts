"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  SiteInventoryData,
  SiteInventoryFormOptions,
  SiteInventoryMeta,
  SiteInventoryParams,
  StationStatus,
} from "./types";

const emptyFormOptions: SiteInventoryFormOptions = {
  memberships: [],
  stationSizes: [],
  stations: [],
};

export function useAnalyticsSiteInventory() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  const [stationSizeId, setStationSizeId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<StationStatus | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<SiteInventoryFormOptions>(emptyFormOptions);

  const params: SiteInventoryParams = {
    orgId,
    stationId,
    stationSizeId,
    status,
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadInventory(params), {
    refreshDeps: [orgId, stationId, stationSizeId, status],
  });

  const inventory = (data?.data ?? null) as SiteInventoryData | null;
  const meta = (data?.meta ?? {}) as SiteInventoryMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as SiteInventoryFormOptions;
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
      setStationSizeId(undefined);
      setStatus(undefined);
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const selectStation = useCallback((id: string | undefined) => {
    setStationId(id);
  }, []);

  const selectStationSize = useCallback((id: string | undefined) => {
    setStationSizeId(id);
    setStationId(undefined);
  }, []);

  const selectStatus = useCallback((value: StationStatus | undefined) => {
    setStatus(value);
    setStationId(undefined);
  }, []);

  const clearFilters = useCallback(() => {
    setStationId(undefined);
    setStationSizeId(undefined);
    setStatus(undefined);
  }, []);

  return {
    inventory,
    meta,
    loading,
    error,
    orgId,
    stationId,
    stationSizeId,
    status,
    formOptions,
    selectOrg,
    selectStation,
    selectStationSize,
    selectStatus,
    clearFilters,
    refresh,
    loadFormOptions,
  };
}
