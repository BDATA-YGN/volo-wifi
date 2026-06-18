"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  PeriodPreset,
  RevenueAnalyticsData,
  RevenueAnalyticsMeta,
  RevenueAnalyticsParams,
  RevenueFormOptions,
} from "./types";
import { DEFAULT_PRESET } from "./constant";

const emptyFormOptions: RevenueFormOptions = {
  memberships: [],
  currency: "MMK",
};

export function useAnalyticsRevenue() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET);
  const [customPeriod, setCustomPeriod] = useState<{
    periodFrom?: string;
    periodTo?: string;
  }>({});
  const [formOptions, setFormOptions] = useState<RevenueFormOptions>(emptyFormOptions);

  const params: RevenueAnalyticsParams = {
    orgId,
    ...(customPeriod.periodFrom && customPeriod.periodTo ? customPeriod : { preset }),
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    refreshDeps: [orgId, preset, customPeriod.periodFrom, customPeriod.periodTo],
  });

  const analytics = (data?.data ?? null) as RevenueAnalyticsData | null;
  const meta = (data?.meta ?? {}) as RevenueAnalyticsMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as RevenueFormOptions;
    setFormOptions(opts);
    if (!targetOrgId && opts.memberships.length === 1) {
      setOrgId(opts.memberships[0].id);
    }
    return opts;
  }, []);

  const selectOrg = useCallback((id: string) => {
    setOrgId(id);
    setCustomPeriod({});
    void loadFormOptions(id);
  }, [loadFormOptions]);

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
    formOptions,
    selectOrg,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    refresh,
    loadFormOptions,
  };
}
