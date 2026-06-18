"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_RECONCILIATION_APPROVALS_API } from "./constant";
import type {
  ApprovalAnalyticsData,
  ApprovalAnalyticsParams,
  ApprovalDetail,
  ApprovalDetailParams,
  ApprovalsFormOptions,
} from "./types";

export type ApprovalAnalyticsResponse = CommonResponse & {
  data: ApprovalAnalyticsData | null;
  meta?: Record<string, unknown>;
};

export type ApprovalDetailResponse = CommonResponse & {
  data: {
    detail: ApprovalDetail;
    org: { id: string; name: string; code: string; currency: string };
  };
};

export const loadAnalytics = async (
  params?: ApprovalAnalyticsParams
): Promise<ApprovalAnalyticsResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_RECONCILIATION_APPROVALS_API.listOrDetails(), {
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

export const loadApprovalDetail = async (
  params: ApprovalDetailParams
): Promise<ApprovalDetailResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_RECONCILIATION_APPROVALS_API.listOrDetails(), {
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
): Promise<CommonResponse & { data: ApprovalsFormOptions }> => {
  try {
    const res = await apiClient.get(ANALYTICS_RECONCILIATION_APPROVALS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
