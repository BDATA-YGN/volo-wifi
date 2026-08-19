"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_SERVICE_PLANS_API } from "./constant";
import type { PlanAnalyticsData, PlanAnalyticsParams, PlansFormOptions } from "./types";

export type PlanAnalyticsResponse = CommonResponse & {
  data: PlanAnalyticsData | null;
  meta?: Record<string, unknown>;
};

export const loadAnalytics = async (
  params?: PlanAnalyticsParams
): Promise<PlanAnalyticsResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_SERVICE_PLANS_API.listOrDetails(), {
      params: {
        orgId: params?.orgId || undefined,
        stationId: params?.stationId || undefined,
        resellerId: params?.resellerId || undefined,
        profile: params?.profile || undefined,
        planId: params?.planId || undefined,
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
): Promise<CommonResponse & { data: PlansFormOptions }> => {
  try {
    const res = await apiClient.get(ANALYTICS_SERVICE_PLANS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
