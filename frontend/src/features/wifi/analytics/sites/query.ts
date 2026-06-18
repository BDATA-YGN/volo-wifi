"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_SITES_API } from "./constant";
import type { SiteAnalyticsData, SiteAnalyticsParams, SitesFormOptions } from "./types";

export type SiteAnalyticsResponse = CommonResponse & {
  data: SiteAnalyticsData | null;
  meta?: Record<string, unknown>;
};

export const loadAnalytics = async (
  params?: SiteAnalyticsParams
): Promise<SiteAnalyticsResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_SITES_API.listOrDetails(), {
      params: {
        orgId: params?.orgId || undefined,
        stationId: params?.stationId || undefined,
        stationSizeId: params?.stationSizeId || undefined,
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
): Promise<CommonResponse & { data: SitesFormOptions }> => {
  try {
    const res = await apiClient.get(ANALYTICS_SITES_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
