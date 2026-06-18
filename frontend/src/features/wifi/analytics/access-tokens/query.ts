"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_ACCESS_TOKENS_API } from "./constant";
import type {
  AccessTokensFormOptions,
  CredentialAnalyticsData,
  CredentialAnalyticsParams,
} from "./types";

export type CredentialAnalyticsResponse = CommonResponse & {
  data: CredentialAnalyticsData | null;
  meta?: Record<string, unknown>;
};

export const loadAnalytics = async (
  params?: CredentialAnalyticsParams
): Promise<CredentialAnalyticsResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_ACCESS_TOKENS_API.listOrDetails(), {
      params: {
        orgId: params?.orgId || undefined,
        planId: params?.planId || undefined,
        type: params?.type || undefined,
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
): Promise<CommonResponse & { data: AccessTokensFormOptions }> => {
  try {
    const res = await apiClient.get(ANALYTICS_ACCESS_TOKENS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
