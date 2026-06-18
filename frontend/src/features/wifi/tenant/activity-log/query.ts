"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { TENANT_ACTIVITY_LOG_API } from "./constant";
import type { ActivityLogFormOptions, ActivityLogListParams } from "./types";

export const list = async (params?: ActivityLogListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(TENANT_ACTIVITY_LOG_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        view: params?.view || undefined,
        action: params?.action || undefined,
        entity: params?.entity || undefined,
        createdFrom: params?.createdFrom || undefined,
        createdTo: params?.createdTo || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(TENANT_ACTIVITY_LOG_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: ActivityLogFormOptions }> => {
  try {
    const res = await apiClient.get(TENANT_ACTIVITY_LOG_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
