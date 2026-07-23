"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  CoverageAnalyticsData,
  CoverageAnalyticsMeta,
  CoverageAnalyticsParams,
  CoverageDetail,
  CoverageFormOptions,
  EligibilityStatus,
} from "./types";

const emptyFormOptions: CoverageFormOptions = {
  memberships: [],
  stations: [],
  resellers: [],
};

export function useAnalyticsReconciliationCoverage() {
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [stationId, setStationId] = useState<string | undefined>(undefined);
  const [resellerId, setResellerId] = useState<string | undefined>(undefined);
  const [eligibility, setEligibility] = useState<EligibilityStatus | undefined>(undefined);
  const [formOptions, setFormOptions] = useState<CoverageFormOptions>(emptyFormOptions);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<CoverageDetail | null>(null);

  const params: CoverageAnalyticsParams = {
    orgId,
    stationId,
    resellerId,
    eligibility,
  };

  const { data, loading, error, refresh } = useRequest(() => Query.loadAnalytics(params), {
    refreshDeps: [orgId, stationId, resellerId, eligibility],
  });

  const analytics = (data?.data ?? null) as CoverageAnalyticsData | null;
  const meta = (data?.meta ?? {}) as CoverageAnalyticsMeta;

  const loadFormOptions = useCallback(async (targetOrgId?: string) => {
    const res = await Query.loadFormOptions(targetOrgId);
    const opts = res.data as CoverageFormOptions;
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
      setEligibility(undefined);
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

  const selectEligibility = useCallback((value: EligibilityStatus | undefined) => {
    setEligibility(value);
  }, []);

  const clearFilters = useCallback(() => {
    setStationId(undefined);
    setResellerId(undefined);
    setEligibility(undefined);
  }, []);

  const loadDetail = useCallback(
    async (coverageId: string) => {
      if (!orgId) return null;
      setDetailLoading(true);
      try {
        const res = await Query.loadCoverageDetail({ orgId, coverageId });
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
    eligibility,
    formOptions,
    selectedDetail,
    detailLoading,
    selectOrg,
    selectStation,
    selectReseller,
    selectEligibility,
    clearFilters,
    loadDetail,
    clearDetail,
    refresh,
    loadFormOptions,
  };
}
