"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { NETWORK_RADIUS_AUTH_EVENTS_API } from "./constant";
import type { AuthEventsFormOptions, AuthEventsListParams } from "./types";

export const list = async (params?: AuthEventsListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_AUTH_EVENTS_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        stationId: params?.stationId || undefined,
        outcome: params?.outcome || undefined,
        view: params?.view || undefined,
        authFrom: params?.authFrom || undefined,
        authTo: params?.authTo || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_AUTH_EVENTS_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: AuthEventsFormOptions }> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_AUTH_EVENTS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
