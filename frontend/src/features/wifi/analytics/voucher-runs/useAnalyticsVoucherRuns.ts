"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  VoucherRunAnalyticsData,
  VoucherRunAnalyticsMeta,
  VoucherRunAnalyticsParams,
  VoucherRunsFormOptions,
} from "./types";
import { currentMonthKey, monthPeriod } from "./constant";

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
  const [month, setMonth] = useState(currentMonthKey);
  const [formOptions, setFormOptions] = useState<VoucherRunsFormOptions>(emptyFormOptions);

  const params: VoucherRunAnalyticsParams = {
    orgId,
    planId,
    stationId,
    batchId,
    ...monthPeriod(month),
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    refreshDeps: [orgId, planId, stationId, batchId, month],
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

  const selectMonth = useCallback((value: string) => {
    setMonth(value);
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
    month,
    formOptions,
    selectOrg,
    selectPlan,
    selectStation,
    selectBatch,
    selectMonth,
    clearFilters,
    refresh,
    loadFormOptions,
  };
}
