"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type { PeriodPreset, TenantAnalyticsData, TenantAnalyticsMeta, TenantAnalyticsParams } from "./types";
import { DEFAULT_PRESET } from "./constant";

export function useAnalyticsTenants() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET);
  const [customPeriod, setCustomPeriod] = useState<{
    periodFrom?: string;
    periodTo?: string;
  }>({});

  const params: TenantAnalyticsParams = {
    orgId,
    ...(customPeriod.periodFrom && customPeriod.periodTo ? customPeriod : { preset }),
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    refreshDeps: [orgId, preset, customPeriod.periodFrom, customPeriod.periodTo],
  });

  const analytics = (data?.data ?? null) as TenantAnalyticsData | null;
  const meta = (data?.meta ?? {}) as TenantAnalyticsMeta;

  const selectOrg = useCallback((id: string | undefined) => {
    setOrgId(id);
    setCustomPeriod({});
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

  return {
    analytics,
    meta,
    loading,
    error,
    orgId,
    preset,
    customPeriod,
    selectOrg,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    refresh,
  };
}
