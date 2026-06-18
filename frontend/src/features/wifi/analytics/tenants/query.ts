"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_TENANTS_API } from "./constant";
import type { TenantAnalyticsData, TenantAnalyticsParams } from "./types";

export type TenantAnalyticsResponse = CommonResponse & {
  data: TenantAnalyticsData | null;
  meta?: Record<string, unknown>;
};

export const loadAnalytics = async (
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_TENANTS_API.listOrDetails(), {
      params: {
        orgId: params?.orgId || undefined,
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
