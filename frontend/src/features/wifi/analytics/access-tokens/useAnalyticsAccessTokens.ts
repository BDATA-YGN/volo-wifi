"use client";

import { useCallback, useRef, useState } from "react";
import { useRequest } from "ahooks";
import dayjs from "dayjs";
import { singleMembershipOrgId } from "@/features/wifi/shared/site-allow-list";
import type { CredentialType } from "./types";
import * as Query from "./query";
import type {
  AccessTokensFormOptions,
  CredentialAnalyticsData,
  CredentialAnalyticsMeta,
  CredentialAnalyticsParams,
  PeriodPreset,
} from "./types";
import { DEFAULT_PRESET } from "./constant";

const emptyFormOptions: AccessTokensFormOptions = {
  memberships: [],
  plans: [],
};

export function useAnalyticsAccessTokens() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [credentialType, setCredentialType] = useState<CredentialType | undefined>(undefined);
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET);
  const [customPeriod, setCustomPeriod] = useState<{
    periodFrom?: string;
    periodTo?: string;
  }>(() => ({
    periodFrom: dayjs().startOf("day").toISOString(),
    periodTo: dayjs().endOf("day").toISOString(),
  }));
  const [formOptions, setFormOptions] = useState<AccessTokensFormOptions>(emptyFormOptions);
  const formOptionsSeq = useRef(0);

  const params: CredentialAnalyticsParams = {
    orgId,
    planId,
    type: credentialType,
    ...(customPeriod.periodFrom && customPeriod.periodTo ? customPeriod : { preset }),
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    ready: Boolean(orgId),
    refreshDeps: [orgId, planId, credentialType, preset, customPeriod.periodFrom, customPeriod.periodTo],
  });

  const analytics = (data?.data ?? null) as CredentialAnalyticsData | null;
  const meta = (data?.meta ?? {}) as CredentialAnalyticsMeta;

  const applyOrgFormOptions = useCallback((opts: AccessTokensFormOptions) => {
    setFormOptions({
      memberships: opts.memberships ?? [],
      plans: opts.plans ?? [],
    });
  }, []);

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const seq = ++formOptionsSeq.current;
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as AccessTokensFormOptions;
    if (seq !== formOptionsSeq.current) return opts;

    const onlyOrgId = singleMembershipOrgId(opts, targetOrgId);
    if (onlyOrgId) {
      setOrgId(onlyOrgId);
      const scoped = await Query.loadFormOptions(onlyOrgId);
      if (seq !== formOptionsSeq.current) return scoped.data as AccessTokensFormOptions;
      const scopedOpts = scoped.data as AccessTokensFormOptions;
      applyOrgFormOptions(scopedOpts);
      return scopedOpts;
    }

    if (!targetOrgId) {
      setFormOptions((prev) => ({
        ...prev,
        memberships: opts.memberships ?? prev.memberships,
      }));
      return opts;
    }

    applyOrgFormOptions(opts);
    return opts;
  }, [applyOrgFormOptions]);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setPlanId(undefined);
      setCredentialType(undefined);
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const selectPlan = useCallback((id: string | undefined) => {
    setPlanId(id);
  }, []);

  const selectCredentialType = useCallback((value: CredentialType | undefined) => {
    setCredentialType(value);
    setPlanId(undefined);
  }, []);

  const selectPreset = useCallback((value: PeriodPreset) => {
    setPreset(value);
    setCustomPeriod({});
  }, []);

  const selectCustomPeriod = useCallback((periodFrom: string, periodTo: string) => {
    setCustomPeriod((prev) =>
      prev.periodFrom === periodFrom && prev.periodTo === periodTo
        ? prev
        : { periodFrom, periodTo },
    );
  }, []);

  const clearCustomPeriod = useCallback(() => {
    setCustomPeriod({});
  }, []);

  const clearFilters = useCallback(() => {
    setPlanId(undefined);
    setCredentialType(undefined);
  }, []);

  return {
    analytics,
    meta,
    loading,
    error,
    orgId,
    planId,
    credentialType,
    preset,
    customPeriod,
    formOptions,
    selectOrg,
    selectPlan,
    selectCredentialType,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    refresh,
    loadFormOptions,
  };
}
