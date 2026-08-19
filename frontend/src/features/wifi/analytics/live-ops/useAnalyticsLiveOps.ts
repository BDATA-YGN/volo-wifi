"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import dayjs from "dayjs";
import * as Query from "./query";
import type {
  LiveOpsAnalyticsData,
  LiveOpsAnalyticsMeta,
  LiveOpsAnalyticsParams,
  LiveOpsFormOptions,
  LiveOpsTab,
} from "./types";
import { DEFAULT_REFRESH_MS, DEFAULT_TAB } from "./constant";

const emptyFormOptions: LiveOpsFormOptions = {
  memberships: [],
  stations: [],
  stationSizes: [],
  plans: [],
  profiles: [],
};

export function useAnalyticsLiveOps() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  const [stationSizeId, setStationSizeId] = useState<string | undefined>(undefined);
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [refreshMs, setRefreshMs] = useState(DEFAULT_REFRESH_MS);
  const [tab, setTab] = useState<LiveOpsTab>(DEFAULT_TAB);
  const [formOptions, setFormOptions] = useState<LiveOpsFormOptions>(emptyFormOptions);

  const params: LiveOpsAnalyticsParams = {
    orgId,
    stationId,
    stationSizeId,
    planId,
    profile,
    date,
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    refreshDeps: [orgId, stationId, stationSizeId, planId, profile, date],
    pollingInterval: refreshMs > 0 && orgId ? refreshMs : undefined,
    pollingWhenHidden: false,
  });

  const analytics = (data?.data ?? null) as LiveOpsAnalyticsData | null;
  const meta = (data?.meta ?? {}) as LiveOpsAnalyticsMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as LiveOpsFormOptions;
    setFormOptions({
      ...emptyFormOptions,
      ...opts,
      stations: opts.stations ?? [],
      stationSizes: opts.stationSizes ?? [],
      plans: opts.plans ?? [],
      profiles: opts.profiles ?? [],
    });
    if (!targetOrgId && opts.memberships.length === 1 && !opts.canSwitchOrg) {
      setOrgId(opts.memberships[0].id);
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setStationId(undefined);
      setStationSizeId(undefined);
      setPlanId(undefined);
      setProfile(undefined);
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const selectStationSize = useCallback((id: string | undefined) => {
    setStationSizeId(id);
    setStationId((prev) => {
      if (!prev || !id) return prev;
      const site = formOptions.stations.find((s) => s.id === prev);
      return !site || site.stationSizeId === id ? prev : undefined;
    });
  }, [formOptions.stations]);

  const selectProfile = useCallback((value: string | undefined) => {
    setProfile(value);
    setStationId(undefined);
  }, []);

  const clearFilters = useCallback(() => {
    setStationId(undefined);
    setStationSizeId(undefined);
    setPlanId(undefined);
    setProfile(undefined);
  }, []);

  return {
    analytics,
    meta,
    loading,
    error,
    orgId,
    stationId,
    stationSizeId,
    planId,
    profile,
    date,
    refreshMs,
    tab,
    formOptions,
    selectOrg,
    selectStation: setStationId,
    selectStationSize,
    selectPlan: setPlanId,
    selectProfile,
    selectDate: setDate,
    selectRefreshMs: setRefreshMs,
    selectTab: setTab,
    clearFilters,
    refresh,
    loadFormOptions,
  };
}
