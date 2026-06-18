"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { WIFI_OVERVIEW_API } from "./constant";
import type { OverviewDashboardData, OverviewFormOptions, OverviewParams } from "./types";

export type OverviewDashboardResponse = CommonResponse & {
  data: OverviewDashboardData | null;
  meta?: Record<string, unknown>;
};

export const loadDashboard = async (
  params?: OverviewParams
): Promise<OverviewDashboardResponse> => {
  try {
    const res = await apiClient.get(WIFI_OVERVIEW_API.listOrDetails(), {
      params: { orgId: params?.orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: OverviewFormOptions }> => {
  try {
    const res = await apiClient.get(WIFI_OVERVIEW_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
