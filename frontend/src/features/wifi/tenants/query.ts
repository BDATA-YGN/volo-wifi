"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { TENANTS_API } from "./constant";
import type { TenantEditFormValues, TenantsListParams } from "./types";

export const list = async (params?: TenantsListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(TENANTS_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        isActive: params?.isActive || undefined,
        licenseStatus: params?.licenseStatus || undefined,
        hasLicense: params?.hasLicense || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(TENANTS_API.listOrDetails(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const update = async (
  id: string,
  payload: TenantEditFormValues
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(TENANTS_API.createOrUpdate(id), {
      ...payload,
      description: payload.description?.trim() || null,
      announcement: payload.announcement?.trim() || null,
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
