"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  PeriodPreset,
  SessionTrafficData,
  SessionTrafficFormOptions,
  SessionTrafficMeta,
  SessionTrafficParams,
} from "./types";
import { DEFAULT_PRESET } from "./constant";

const emptyFormOptions: SessionTrafficFormOptions = {
  memberships: [],
  stations: [],
  plans: [],
};

export function useAnalyticsSessionTraffic() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET);
  const [customPeriod, setCustomPeriod] = useState<{
    periodFrom?: string;
    periodTo?: string;
  }>({});
  const [formOptions, setFormOptions] = useState<SessionTrafficFormOptions>(emptyFormOptions);

  const params: SessionTrafficParams = {
    orgId,
    stationId,
    planId,
    ...(customPeriod.periodFrom && customPeriod.periodTo ? customPeriod : { preset }),
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    refreshDeps: [
      orgId,
      stationId,
      planId,
      preset,
      customPeriod.periodFrom,
      customPeriod.periodTo,
    ],
  });

  const analytics = (data?.data ?? null) as SessionTrafficData | null;
  const meta = (data?.meta ?? {}) as SessionTrafficMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as SessionTrafficFormOptions;
    setFormOptions(opts);
    if (!targetOrgId && opts.memberships.length === 1) {
      setOrgId(opts.memberships[0].id);
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setStationId(undefined);
      setPlanId(undefined);
      setCustomPeriod({});
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const selectStation = useCallback((id: string | undefined) => {
    setStationId(id);
  }, []);

  const selectPlan = useCallback((id: string | undefined) => {
    setPlanId(id);
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
    setPlanId(undefined);
  }, []);

  return {
    analytics,
    meta,
    loading,
    error,
    orgId,
    stationId,
    planId,
    preset,
    customPeriod,
    formOptions,
    selectOrg,
    selectStation,
    selectPlan,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  };
}
