"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  InsightsFormOptions,
  InsightsMeta,
  InsightsParams,
  PartnerInsightsData,
  PeriodPreset,
} from "./types";
import { DEFAULT_PRESET } from "./constant";

const emptyFormOptions: InsightsFormOptions = {
  memberships: [],
  resellers: [],
  currency: "MMK",
};

export function useCommercePartnersInsights() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [resellerId, setResellerId] = useState<string | undefined>(undefined);
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET);
  const [customPeriod, setCustomPeriod] = useState<{
    periodFrom?: string;
    periodTo?: string;
  }>({});
  const [formOptions, setFormOptions] = useState<InsightsFormOptions>(emptyFormOptions);

  const params: InsightsParams = {
    orgId,
    resellerId,
    ...(customPeriod.periodFrom && customPeriod.periodTo
      ? customPeriod
      : { preset }),
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadInsights(params), {
    refreshDeps: [
      orgId,
      resellerId,
      preset,
      customPeriod.periodFrom,
      customPeriod.periodTo,
    ],
  });

  const insights = (data?.data ?? null) as PartnerInsightsData | null;
  const meta = (data?.meta ?? {}) as InsightsMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as InsightsFormOptions;
    setFormOptions(opts);
    if (!targetOrgId && opts.memberships.length === 1) {
      setOrgId(opts.memberships[0].id);
    }
    return opts;
  }, []);

  const selectOrg = useCallback(
    (id: string) => {
      setOrgId(id);
      setResellerId(undefined);
      setCustomPeriod({});
      void loadFormOptions(id);
    },
    [loadFormOptions]
  );

  const selectReseller = useCallback((id: string) => {
    setResellerId(id);
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

  return {
    insights,
    meta,
    loading,
    error,
    orgId,
    resellerId,
    preset,
    customPeriod,
    formOptions,
    selectOrg,
    selectReseller,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    refresh,
    loadFormOptions,
  };
}
