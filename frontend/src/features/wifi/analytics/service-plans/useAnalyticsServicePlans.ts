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
  stations: [],
  resellers: [],
  currency: "MMK",
};

export function useAnalyticsServicePlans() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  const [resellerId, setResellerId] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<string | undefined>(undefined);
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET);
  const [customPeriod, setCustomPeriod] = useState<{
    periodFrom?: string;
    periodTo?: string;
  }>({});
  const [formOptions, setFormOptions] = useState<PlansFormOptions>(emptyFormOptions);
  const formOptionsSeq = useRef(0);

  const params: PlanAnalyticsParams = {
    orgId,
    stationId,
    resellerId,
    profile,
    planId,
    ...(customPeriod.periodFrom && customPeriod.periodTo ? customPeriod : { preset }),
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    ready: Boolean(orgId),
    refreshDeps: [
      orgId,
      stationId,
      resellerId,
      profile,
      planId,
      preset,
      customPeriod.periodFrom,
      customPeriod.periodTo,
    ],
  });

  const analytics = (data?.data ?? null) as PlanAnalyticsData | null;
  const meta = (data?.meta ?? {}) as PlanAnalyticsMeta;

  const applyOrgFormOptions = useCallback((opts: PlansFormOptions, scopedOrgId: string) => {
    setFormOptions({
      memberships: opts.memberships ?? [],
      plans: opts.plans ?? [],
      stations: filterBySiteAllowList(opts.stations ?? [], sessionStationAllowList(scopedOrgId)),
      resellers: opts.resellers ?? [],
      profiles: opts.profiles ?? [],
      currency: opts.currency ?? "MMK",
      canSwitchOrg: opts.canSwitchOrg,
      requiresOrgSelection: opts.requiresOrgSelection,
    });
  }, []);

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const seq = ++formOptionsSeq.current;
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as PlansFormOptions;
    if (seq !== formOptionsSeq.current) return opts;

    const onlyOrgId = singleMembershipOrgId(opts, targetOrgId);

    if (onlyOrgId) {
      setOrgId(onlyOrgId);
      const scoped = await Query.loadFormOptions(onlyOrgId);
      if (seq !== formOptionsSeq.current) return scoped.data as PlansFormOptions;
      const scopedOpts = scoped.data as PlansFormOptions;
      applyOrgFormOptions(scopedOpts, onlyOrgId);
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

    applyOrgFormOptions(opts, targetOrgId);
    return opts;
  }, [applyOrgFormOptions]);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setStationId(undefined);
      setResellerId(undefined);
      setProfile(undefined);
      setPlanId(undefined);
      setCustomPeriod({});
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const selectStation = useCallback((id: string | undefined) => {
    setStationId(id);
  }, []);

  const selectReseller = useCallback((id: string | undefined) => {
    setResellerId(id);
  }, []);

  const selectProfile = useCallback((value: string | undefined) => {
    setProfile(value);
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
    setResellerId(undefined);
    setProfile(undefined);
    setPlanId(undefined);
  }, []);

  return {
    analytics,
    meta,
    loading,
    error,
    orgId,
    stationId,
    resellerId,
    profile,
    planId,
    preset,
    customPeriod,
    formOptions,
    selectOrg,
    selectStation,
    selectReseller,
    selectProfile,
    selectPlan,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  };
}
