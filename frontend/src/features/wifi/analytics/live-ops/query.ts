"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_LIVE_OPS_API } from "./constant";
import type {
  LiveOpsAnalyticsData,
  LiveOpsAnalyticsParams,
  LiveOpsFormOptions,
} from "./types";

export type LiveOpsAnalyticsResponse = CommonResponse & {
  data: LiveOpsAnalyticsData | null;
  meta?: Record<string, unknown>;
};

export const loadAnalytics = async (
  params?: LiveOpsAnalyticsParams
): Promise<LiveOpsAnalyticsResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_LIVE_OPS_API.listOrDetails(), {
      params: {
        orgId: params?.orgId || undefined,
        stationId: params?.stationId || undefined,
        stationSizeId: params?.stationSizeId || undefined,
        planId: params?.planId || undefined,
        profile: params?.profile || undefined,
        date: params?.date || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: LiveOpsFormOptions }> => {
  try {
    const res = await apiClient.get(ANALYTICS_LIVE_OPS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
