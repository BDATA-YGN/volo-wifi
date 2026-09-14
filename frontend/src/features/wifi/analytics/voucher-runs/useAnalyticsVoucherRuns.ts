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
  const formOptionsSeq = useRef(0);

  const params: VoucherRunAnalyticsParams = {
    orgId,
    planId,
    stationId,
    batchId,
    ...monthPeriod(month),
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    ready: Boolean(orgId),
    refreshDeps: [orgId, planId, stationId, batchId, month],
  });

  const analytics = (data?.data ?? null) as VoucherRunAnalyticsData | null;
  const meta = (data?.meta ?? {}) as VoucherRunAnalyticsMeta;

  const applyOrgFormOptions = useCallback((opts: VoucherRunsFormOptions, scopedOrgId: string) => {
    setFormOptions({
      ...opts,
      memberships: opts.memberships ?? [],
      stations: filterBySiteAllowList(opts.stations ?? [], sessionStationAllowList(scopedOrgId)),
      plans: opts.plans ?? [],
    });
  }, []);

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const seq = ++formOptionsSeq.current;
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as VoucherRunsFormOptions;
    if (seq !== formOptionsSeq.current) return opts;

    const onlyOrgId = singleMembershipOrgId(opts, targetOrgId);
    if (onlyOrgId) {
      setOrgId(onlyOrgId);
      const scoped = await Query.loadFormOptions(onlyOrgId);
      if (seq !== formOptionsSeq.current) return scoped.data as VoucherRunsFormOptions;
      const scopedOpts = scoped.data as VoucherRunsFormOptions;
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
