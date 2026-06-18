"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { COMMERCE_PARTNERS_INSIGHTS_API } from "./constant";
import type { InsightsFormOptions, InsightsParams, PartnerInsightsData } from "./types";

export type InsightsResponse = CommonResponse & {
  data: PartnerInsightsData | null;
  meta?: Record<string, unknown>;
};

export const loadInsights = async (params?: InsightsParams): Promise<InsightsResponse> => {
  try {
    const res = await apiClient.get(COMMERCE_PARTNERS_INSIGHTS_API.listOrDetails(), {
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
): Promise<CommonResponse & { data: InsightsFormOptions }> => {
  try {
    const res = await apiClient.get(COMMERCE_PARTNERS_INSIGHTS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
