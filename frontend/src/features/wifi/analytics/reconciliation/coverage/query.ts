"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_RECONCILIATION_COVERAGE_API } from "./constant";
import type {
  CoverageAnalyticsData,
  CoverageAnalyticsParams,
  CoverageDetail,
  CoverageFormOptions,
  CoverageDetailParams,
} from "./types";

export type CoverageAnalyticsResponse = CommonResponse & {
  data: CoverageAnalyticsData | null;
  meta?: Record<string, unknown>;
};

export type CoverageDetailResponse = CommonResponse & {
  data: {
    detail: CoverageDetail;
    org: { id: string; name: string; code: string; currency: string };
  };
};

export const loadAnalytics = async (
  params?: CoverageAnalyticsParams
): Promise<CoverageAnalyticsResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_RECONCILIATION_COVERAGE_API.listOrDetails(), {
      params: {
        orgId: params?.orgId || undefined,
        stationId: params?.stationId || undefined,
        resellerId: params?.resellerId || undefined,
        eligibility: params?.eligibility || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadCoverageDetail = async (
  params: CoverageDetailParams
): Promise<CoverageDetailResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_RECONCILIATION_COVERAGE_API.listOrDetails(), {
      params: {
        orgId: params.orgId || undefined,
        coverageId: params.coverageId,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: CoverageFormOptions }> => {
  try {
    const res = await apiClient.get(ANALYTICS_RECONCILIATION_COVERAGE_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
