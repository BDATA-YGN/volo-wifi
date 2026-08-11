"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  PeriodPreset,
  SiteAnalyticsData,
  SiteAnalyticsMeta,
  SiteAnalyticsParams,
  SiteAnalyticsTab,
  SitesFormOptions,
} from "./types";
import { DEFAULT_PRESET, DEFAULT_SITES_PAGE, DEFAULT_SITES_PAGE_SIZE } from "./constant";

const emptyFormOptions: SitesFormOptions = {
  memberships: [],
  stations: [],
  stationSizes: [],
  currency: "MMK",
};

type ScopeParams = {
  orgId?: string;
  stationId?: string;
  stationSizeId?: string;
  preset: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};

function buildParams(
  scope: ScopeParams,
  view: SiteAnalyticsTab,
  page?: number,
  limit?: number
): SiteAnalyticsParams {
  return {
    orgId: scope.orgId,
    stationId: scope.stationId,
    stationSizeId: scope.stationSizeId,
    view,
    ...(view === "sites"
      ? { page: page ?? DEFAULT_SITES_PAGE, limit: limit ?? DEFAULT_SITES_PAGE_SIZE }
      : {}),
    ...(scope.periodFrom && scope.periodTo
      ? { periodFrom: scope.periodFrom, periodTo: scope.periodTo }
      : { preset: scope.preset }),
  };
}

export function useAnalyticsSites(options: {
  tab: SiteAnalyticsTab;
  page: number;
  pageSize: number;
}) {
  const { tab, page, pageSize } = options;
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  const [stationSizeId, setStationSizeId] = useState<string | undefined>(undefined);
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET);
  const [customPeriod, setCustomPeriod] = useState<{
    periodFrom?: string;
    periodTo?: string;
  }>({});
  const [formOptions, setFormOptions] = useState<SitesFormOptions>(emptyFormOptions);

  const scope: ScopeParams = {
    orgId,
    stationId,
    stationSizeId,
    preset,
    periodFrom: customPeriod.periodFrom,
    periodTo: customPeriod.periodTo,
  };

  const periodDeps = [
    orgId,
    stationId,
    stationSizeId,
    preset,
    customPeriod.periodFrom,
    customPeriod.periodTo,
  ];

  const statsReq = useRequest(
    () => Query.loadAnalytics(buildParams(scope, "stats")),
    {
      ready: Boolean(orgId) && tab === "stats",
      refreshDeps: periodDeps,
    }
  );

  const sitesReq = useRequest(
    () => Query.loadAnalytics(buildParams(scope, "sites", page, pageSize)),
    {
      ready: Boolean(orgId) && tab === "sites",
      refreshDeps: [...periodDeps, page, pageSize],
    }
  );

  const tiersReq = useRequest(
    () => Query.loadAnalytics(buildParams(scope, "tiers")),
    {
      ready: Boolean(orgId) && tab === "tiers",
      refreshDeps: periodDeps,
    }
  );

  const activeReq = tab === "stats" ? statsReq : tab === "sites" ? sitesReq : tiersReq;
  const analytics = (activeReq.data?.data ?? null) as SiteAnalyticsData | null;
  const meta = (activeReq.data?.meta ?? {}) as SiteAnalyticsMeta;
  const loading = activeReq.loading;
  const error = activeReq.error;
  const refresh = activeReq.refresh;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as SitesFormOptions;
    setFormOptions(opts);
    if (
      !targetOrgId &&
      !opts.canSwitchOrg &&
      !opts.requiresOrgSelection &&
      opts.memberships.length === 1
    ) {
      setOrgId(opts.memberships[0].id);
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setStationId(undefined);
      setStationSizeId(undefined);
      setCustomPeriod({});
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

  const selectPreset = useCallback((value: PeriodPreset) => {
    setPreset(value);
    setCustomPeriod({});
  }, []);

  const selectCustomPeriod = useCallback((periodFrom: string, periodTo: string) => {
    setCustomPeriod({ periodFrom, periodTo });
  }, []);

  const clearCustomPeriod = useCallback(() => {
    setCustomPeriod({});
  }, []);

  const clearFilters = useCallback(() => {
    setStationId(undefined);
    setStationSizeId(undefined);
  }, []);

  return {
    analytics,
    meta,
    loading,
    error,
    orgId,
    stationId,
    stationSizeId,
    preset,
    customPeriod,
    formOptions,
    selectOrg,
    selectStation,
    selectStationSize,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  };
}
