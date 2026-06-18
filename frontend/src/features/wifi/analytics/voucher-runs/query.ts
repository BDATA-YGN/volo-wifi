"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_VOUCHER_RUNS_API } from "./constant";
import type {
  VoucherRunAnalyticsData,
  VoucherRunAnalyticsParams,
  VoucherRunsFormOptions,
} from "./types";

export type VoucherRunAnalyticsResponse = CommonResponse & {
  data: VoucherRunAnalyticsData | null;
  meta?: Record<string, unknown>;
};

export const loadAnalytics = async (
  params?: VoucherRunAnalyticsParams
): Promise<VoucherRunAnalyticsResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_VOUCHER_RUNS_API.listOrDetails(), {
      params: {
        orgId: params?.orgId || undefined,
        planId: params?.planId || undefined,
        stationId: params?.stationId || undefined,
        batchId: params?.batchId || undefined,
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

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: VoucherRunsFormOptions }> => {
  try {
    const res = await apiClient.get(ANALYTICS_VOUCHER_RUNS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
