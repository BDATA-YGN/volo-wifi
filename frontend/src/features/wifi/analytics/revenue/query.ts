"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_REVENUE_API } from "./constant";
import type { RevenueAnalyticsData, RevenueAnalyticsParams, RevenueFormOptions } from "./types";

export type RevenueAnalyticsResponse = CommonResponse & {
  data: RevenueAnalyticsData | null;
  meta?: Record<string, unknown>;
};

export const loadAnalytics = async (
  params?: RevenueAnalyticsParams
): Promise<RevenueAnalyticsResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_REVENUE_API.listOrDetails(), {
      params: {
        orgId: params?.orgId || undefined,
        month: params?.month || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: RevenueFormOptions }> => {
  try {
    const res = await apiClient.get(ANALYTICS_REVENUE_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
