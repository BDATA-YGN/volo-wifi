"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  PeriodPreset,
  VoucherRunAnalyticsData,
  VoucherRunAnalyticsMeta,
  VoucherRunAnalyticsParams,
  VoucherRunsFormOptions,
} from "./types";
import { DEFAULT_PRESET } from "./constant";

const emptyFormOptions: VoucherRunsFormOptions = {
  memberships: [],
  plans: [],
  stations: [],
};

export function useAnalyticsVoucherRuns() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  const [batchId, setBatchId] = useState<string | undefined>(undefined);
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET);
  const [customPeriod, setCustomPeriod] = useState<{
    periodFrom?: string;
    periodTo?: string;
  }>({});
  const [formOptions, setFormOptions] = useState<VoucherRunsFormOptions>(emptyFormOptions);

  const params: VoucherRunAnalyticsParams = {
    orgId,
    planId,
    stationId,
    batchId,
    ...(customPeriod.periodFrom && customPeriod.periodTo ? customPeriod : { preset }),
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    refreshDeps: [
      orgId,
      planId,
      stationId,
      batchId,
      preset,
      customPeriod.periodFrom,
      customPeriod.periodTo,
    ],
  });

  const analytics = (data?.data ?? null) as VoucherRunAnalyticsData | null;
  const meta = (data?.meta ?? {}) as VoucherRunAnalyticsMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as VoucherRunsFormOptions;
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
      setStationId(undefined);
      setBatchId(undefined);
      setCustomPeriod({});
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const selectPlan = useCallback((id: string | undefined) => {
    setPlanId(id);
    setBatchId(undefined);
  }, []);

  const selectStation = useCallback((id: string | undefined) => {
    setStationId(id);
    setBatchId(undefined);
  }, []);

  const selectBatch = useCallback((id: string | undefined) => {
    setBatchId(id);
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
    setStationId(undefined);
    setBatchId(undefined);
  }, []);

  return {
    analytics,
    meta,
    loading,
    error,
    orgId,
    planId,
    stationId,
    batchId,
    preset,
    customPeriod,
    formOptions,
    selectOrg,
    selectPlan,
    selectStation,
    selectBatch,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  };
}
