"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_PARTNERS_API } from "./constant";
import type { PartnerAnalyticsData, PartnerAnalyticsParams, PartnersFormOptions } from "./types";

export type PartnerAnalyticsResponse = CommonResponse & {
  data: PartnerAnalyticsData | null;
  meta?: Record<string, unknown>;
};

export const loadAnalytics = async (
  params?: PartnerAnalyticsParams
): Promise<PartnerAnalyticsResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_PARTNERS_API.listOrDetails(), {
      params: {
        orgId: params?.orgId || undefined,
        resellerId: params?.resellerId || undefined,
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
): Promise<CommonResponse & { data: PartnersFormOptions }> => {
  try {
    const res = await apiClient.get(ANALYTICS_PARTNERS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
