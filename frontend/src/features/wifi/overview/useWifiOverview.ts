"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  OverviewDashboardData,
  OverviewFormOptions,
  OverviewMeta,
  OverviewParams,
} from "./types";
import { AUTO_REFRESH_MS } from "./constant";

const emptyFormOptions: OverviewFormOptions = { memberships: [] };

export function useWifiOverview() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [formOptions, setFormOptions] = useState<OverviewFormOptions>(emptyFormOptions);

  const params: OverviewParams = { orgId };

  const { data, loading, error, refresh } = useRequest(() => Query.loadDashboard(params), {
    refreshDeps: [orgId],
    pollingInterval: autoRefresh && orgId ? AUTO_REFRESH_MS : undefined,
    pollingWhenHidden: false,
  });

  const dashboard = (data?.data ?? null) as OverviewDashboardData | null;
  const meta = (data?.meta ?? {}) as OverviewMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as OverviewFormOptions;
    setFormOptions(opts);
    if (!targetOrgId && opts.memberships.length === 1) {
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

  const toggleAutoRefresh = useCallback((value: boolean) => {
    setAutoRefresh(value);
  }, []);

  return {
    dashboard,
    meta,
    loading,
    error,
    orgId,
    autoRefresh,
    formOptions,
    selectOrg,
    toggleAutoRefresh,
    refresh,
    loadFormOptions,
  };
}
