"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  RevenueAnalyticsData,
  RevenueAnalyticsMeta,
  RevenueAnalyticsParams,
  RevenueFormOptions,
} from "./types";
import { currentMonthKey } from "./constant";

const emptyFormOptions: RevenueFormOptions = {
  memberships: [],
  currency: "MMK",
};

export function useAnalyticsRevenue() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState(currentMonthKey());
  const [formOptions, setFormOptions] = useState<RevenueFormOptions>(emptyFormOptions);

  const params: RevenueAnalyticsParams = {
    orgId,
    month,
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    refreshDeps: [orgId, month],
  });

  const analytics = (data?.data ?? null) as RevenueAnalyticsData | null;
  const meta = (data?.meta ?? {}) as RevenueAnalyticsMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as RevenueFormOptions;
    setFormOptions({
      ...emptyFormOptions,
      ...opts,
    });
    if (!targetOrgId && opts.memberships.length === 1 && !opts.canSwitchOrg) {
      setOrgId(opts.memberships[0].id);
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const selectMonth = useCallback((value: string) => {
    setMonth(value);
  }, []);

  return {
    analytics,
    meta,
    loading,
    error,
    orgId,
    month,
    formOptions,
    selectOrg,
    selectMonth,
    refresh,
    loadFormOptions,
  };
}
