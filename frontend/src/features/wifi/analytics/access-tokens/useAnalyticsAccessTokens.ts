"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
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
  }>({});
  const [formOptions, setFormOptions] = useState<AccessTokensFormOptions>(emptyFormOptions);

  const params: CredentialAnalyticsParams = {
    orgId,
    planId,
    type: credentialType,
    ...(customPeriod.periodFrom && customPeriod.periodTo ? customPeriod : { preset }),
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    refreshDeps: [orgId, planId, credentialType, preset, customPeriod.periodFrom, customPeriod.periodTo],
  });

  const analytics = (data?.data ?? null) as CredentialAnalyticsData | null;
  const meta = (data?.meta ?? {}) as CredentialAnalyticsMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as AccessTokensFormOptions;
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
      setCredentialType(undefined);
      setCustomPeriod({});
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
    setCustomPeriod({ periodFrom, periodTo });
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
