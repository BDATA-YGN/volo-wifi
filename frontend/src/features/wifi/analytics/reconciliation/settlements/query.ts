"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_RECONCILIATION_SETTLEMENTS_API } from "./constant";
import type {
  SettlementAnalyticsData,
  SettlementAnalyticsParams,
  SettlementDetail,
  SettlementsFormOptions,
  SettlementDetailParams,
} from "./types";

export type SettlementAnalyticsResponse = CommonResponse & {
  data: SettlementAnalyticsData | null;
  meta?: Record<string, unknown>;
};

export type SettlementDetailResponse = CommonResponse & {
  data: {
    detail: SettlementDetail;
    org: { id: string; name: string; code: string; currency: string };
  };
};

export const loadAnalytics = async (
  params?: SettlementAnalyticsParams
): Promise<SettlementAnalyticsResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_RECONCILIATION_SETTLEMENTS_API.listOrDetails(), {
      params: {
        orgId: params?.orgId || undefined,
        stationId: params?.stationId || undefined,
        resellerId: params?.resellerId || undefined,
        status: params?.status || undefined,
        preset: params?.preset || undefined,
        periodFrom: params?.periodFrom || undefined,
        periodTo: params?.periodTo || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadSettlementDetail = async (
  params: SettlementDetailParams
): Promise<SettlementDetailResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_RECONCILIATION_SETTLEMENTS_API.listOrDetails(), {
      params: {
        orgId: params.orgId || undefined,
        settlementId: params.settlementId,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: SettlementsFormOptions }> => {
  try {
    const res = await apiClient.get(ANALYTICS_RECONCILIATION_SETTLEMENTS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
