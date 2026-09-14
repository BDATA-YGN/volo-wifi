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
  const formOptionsSeq = useRef(0);

  const params: SiteInventoryParams = {
    orgId,
    stationId,
    stationSizeId,
    status,
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadInventory(params), {
    ready: Boolean(orgId),
    refreshDeps: [orgId, stationId, stationSizeId, status],
  });

  const inventory = (data?.data ?? null) as SiteInventoryData | null;
  const meta = (data?.meta ?? {}) as SiteInventoryMeta;

  const applyOrgFormOptions = useCallback((opts: SiteInventoryFormOptions, scopedOrgId: string) => {
    setFormOptions({
      ...opts,
      memberships: opts.memberships ?? [],
      stations: filterBySiteAllowList(opts.stations ?? [], sessionStationAllowList(scopedOrgId)),
    });
  }, []);

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const seq = ++formOptionsSeq.current;
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as SiteInventoryFormOptions;
    if (seq !== formOptionsSeq.current) return opts;

    const onlyOrgId = singleMembershipOrgId(opts, targetOrgId);
    if (onlyOrgId) {
      setOrgId(onlyOrgId);
      const scoped = await Query.loadFormOptions(onlyOrgId);
      if (seq !== formOptionsSeq.current) return scoped.data as SiteInventoryFormOptions;
      const scopedOpts = scoped.data as SiteInventoryFormOptions;
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
