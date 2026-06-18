"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  LiveOpsAnalyticsData,
  LiveOpsAnalyticsMeta,
  LiveOpsAnalyticsParams,
  LiveOpsFormOptions,
  WindowHours,
} from "./types";
import { AUTO_REFRESH_MS, DEFAULT_WINDOW_HOURS } from "./constant";

const emptyFormOptions: LiveOpsFormOptions = {
  memberships: [],
  stations: [],
  resellers: [],
};

export function useAnalyticsLiveOps() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  const [resellerId, setResellerId] = useState<string | undefined>(undefined);
  const [windowHours, setWindowHours] = useState<WindowHours>(DEFAULT_WINDOW_HOURS);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [formOptions, setFormOptions] = useState<LiveOpsFormOptions>(emptyFormOptions);

  const params: LiveOpsAnalyticsParams = {
    orgId,
    stationId,
    resellerId,
    windowHours,
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    refreshDeps: [orgId, stationId, resellerId, windowHours],
    pollingInterval: autoRefresh && orgId ? AUTO_REFRESH_MS : undefined,
    pollingWhenHidden: false,
  });

  const analytics = (data?.data ?? null) as LiveOpsAnalyticsData | null;
  const meta = (data?.meta ?? {}) as LiveOpsAnalyticsMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as LiveOpsFormOptions;
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
      setResellerId(undefined);
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const selectStation = useCallback((id: string | undefined) => {
    setStationId(id);
  }, []);

  const selectReseller = useCallback((id: string | undefined) => {
    setResellerId(id);
  }, []);

  const selectWindowHours = useCallback((value: WindowHours) => {
    setWindowHours(value);
  }, []);

  const toggleAutoRefresh = useCallback((value: boolean) => {
    setAutoRefresh(value);
  }, []);

  const clearFilters = useCallback(() => {
    setStationId(undefined);
    setResellerId(undefined);
  }, []);

  return {
    analytics,
    meta,
    loading,
    error,
    orgId,
    stationId,
    resellerId,
    windowHours,
    autoRefresh,
    formOptions,
    selectOrg,
    selectStation,
    selectReseller,
    selectWindowHours,
    toggleAutoRefresh,
    clearFilters,
    refresh,
    loadFormOptions,
  };
}
