"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import type { PlanQuotaType } from "@/features/wifi/catalog/service-plans/types";
import * as Query from "./query";
import type {
  PeriodPreset,
  PlanAnalyticsData,
  PlanAnalyticsMeta,
  PlanAnalyticsParams,
  PlansFormOptions,
} from "./types";
import { DEFAULT_PRESET } from "./constant";

const emptyFormOptions: PlansFormOptions = {
  memberships: [],
  plans: [],
  currency: "MMK",
};

export function useAnalyticsServicePlans() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [quotaType, setQuotaType] = useState<PlanQuotaType | undefined>(undefined);
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET);
  const [customPeriod, setCustomPeriod] = useState<{
    periodFrom?: string;
    periodTo?: string;
  }>({});
  const [formOptions, setFormOptions] = useState<PlansFormOptions>(emptyFormOptions);

  const params: PlanAnalyticsParams = {
    orgId,
    planId,
    quotaType,
    ...(customPeriod.periodFrom && customPeriod.periodTo ? customPeriod : { preset }),
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    refreshDeps: [orgId, planId, quotaType, preset, customPeriod.periodFrom, customPeriod.periodTo],
  });

  const analytics = (data?.data ?? null) as PlanAnalyticsData | null;
  const meta = (data?.meta ?? {}) as PlanAnalyticsMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as PlansFormOptions;
    setFormOptions(opts);
    if (!targetOrgId && opts.memberships.length === 1) {
      setOrgId(opts.memberships[0].id);
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setPlanId(undefined);
      setQuotaType(undefined);
      setCustomPeriod({});
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const selectPlan = useCallback((id: string | undefined) => {
    setPlanId(id);
  }, []);

  const selectQuotaType = useCallback((value: PlanQuotaType | undefined) => {
    setQuotaType(value);
    setPlanId(undefined);
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
    setPlanId(undefined);
    setQuotaType(undefined);
  }, []);

  return {
    analytics,
    meta,
    loading,
    error,
    orgId,
    planId,
    quotaType,
    preset,
    customPeriod,
    formOptions,
    selectOrg,
    selectPlan,
    selectQuotaType,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  };
}
