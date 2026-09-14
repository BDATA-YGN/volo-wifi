"use client";

import { useCallback, useRef, useState } from "react";
import { useRequest } from "ahooks";
import { singleMembershipOrgId } from "@/features/wifi/shared/site-allow-list";
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
  const formOptionsSeq = useRef(0);

  const params: RevenueAnalyticsParams = {
    orgId,
    month,
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    ready: Boolean(orgId),
    refreshDeps: [orgId, month],
  });

  const analytics = (data?.data ?? null) as RevenueAnalyticsData | null;
  const meta = (data?.meta ?? {}) as RevenueAnalyticsMeta;

  const applyOrgFormOptions = useCallback((opts: RevenueFormOptions) => {
    setFormOptions({
      memberships: opts.memberships ?? [],
      currency: opts.currency ?? "MMK",
      canSwitchOrg: opts.canSwitchOrg,
      requiresOrgSelection: opts.requiresOrgSelection,
    });
  }, []);

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const seq = ++formOptionsSeq.current;
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as RevenueFormOptions;
    if (seq !== formOptionsSeq.current) return opts;

    const onlyOrgId = singleMembershipOrgId(opts, targetOrgId);
    if (onlyOrgId) {
      setOrgId(onlyOrgId);
      const scoped = await Query.loadFormOptions(onlyOrgId);
      if (seq !== formOptionsSeq.current) return scoped.data as RevenueFormOptions;
      const scopedOpts = scoped.data as RevenueFormOptions;
      applyOrgFormOptions(scopedOpts);
      return scopedOpts;
    }

    if (!targetOrgId) {
      setFormOptions((prev) => ({
        ...prev,
        memberships: opts.memberships ?? prev.memberships,
        canSwitchOrg: opts.canSwitchOrg,
        requiresOrgSelection: opts.requiresOrgSelection,
        currency: opts.currency ?? prev.currency,
      }));
      return opts;
    }

    applyOrgFormOptions(opts);
    return opts;
  }, [applyOrgFormOptions]);

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
