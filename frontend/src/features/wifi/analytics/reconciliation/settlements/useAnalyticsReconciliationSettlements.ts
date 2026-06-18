"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  PeriodPreset,
  SettlementAnalyticsData,
  SettlementAnalyticsMeta,
  SettlementAnalyticsParams,
  SettlementDetail,
  SettlementStatus,
  SettlementsFormOptions,
} from "./types";
import { DEFAULT_PRESET } from "./constant";

const emptyFormOptions: SettlementsFormOptions = {
  memberships: [],
  stations: [],
  resellers: [],
};

export function useAnalyticsReconciliationSettlements() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  const [resellerId, setResellerId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<SettlementStatus | undefined>(undefined);
  const [preset, setPreset] = useState<PeriodPreset>(DEFAULT_PRESET);
  const [customPeriod, setCustomPeriod] = useState<{
    periodFrom?: string;
    periodTo?: string;
  }>({});
  const [formOptions, setFormOptions] = useState<SettlementsFormOptions>(emptyFormOptions);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<SettlementDetail | null>(null);

  const params: SettlementAnalyticsParams = {
    orgId,
    stationId,
    resellerId,
    status,
    ...(customPeriod.periodFrom && customPeriod.periodTo ? customPeriod : { preset }),
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    refreshDeps: [
      orgId,
      stationId,
      resellerId,
      status,
      preset,
      customPeriod.periodFrom,
      customPeriod.periodTo,
    ],
  });

  const analytics = (data?.data ?? null) as SettlementAnalyticsData | null;
  const meta = (data?.meta ?? {}) as SettlementAnalyticsMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as SettlementsFormOptions;
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
      setResellerId(undefined);
      setStatus(undefined);
      setCustomPeriod({});
      setSelectedDetail(null);
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

  const selectStatus = useCallback((value: SettlementStatus | undefined) => {
    setStatus(value);
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
    setStatus(undefined);
  }, []);

  const loadDetail = useCallback(
    async (settlementId: string) => {
      if (!orgId) return null;
      setDetailLoading(true);
      try {
        const res = await Query.loadSettlementDetail({ orgId, settlementId });
        const detail = res.data.detail;
        setSelectedDetail(detail);
        return detail;
      } finally {
        setDetailLoading(false);
      }
    },
    [orgId]
  );

  const clearDetail = useCallback(() => {
    setSelectedDetail(null);
  }, []);

  return {
    analytics,
    meta,
    loading,
    error,
    orgId,
    stationId,
    resellerId,
    status,
    preset,
    customPeriod,
    formOptions,
    selectedDetail,
    detailLoading,
    selectOrg,
    selectStation,
    selectReseller,
    selectStatus,
    selectPreset,
    selectCustomPeriod,
    clearCustomPeriod,
    clearFilters,
    loadDetail,
    clearDetail,
    refresh,
    loadFormOptions,
  };
}
