"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { NETWORK_RADIUS_LIVE_SESSIONS_API } from "./constant";
import type { LiveSessionsFormOptions, LiveSessionsListParams } from "./types";

export const list = async (params?: LiveSessionsListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_LIVE_SESSIONS_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        stationId: params?.stationId || undefined,
        status: params?.status || undefined,
        view: params?.view || undefined,
        startedFrom: params?.startedFrom || undefined,
        startedTo: params?.startedTo || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_LIVE_SESSIONS_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: LiveSessionsFormOptions }> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_LIVE_SESSIONS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
