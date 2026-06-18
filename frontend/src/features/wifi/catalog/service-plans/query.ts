"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { CATALOG_SERVICE_PLANS_API } from "./constant";
import type {
  ServicePlanFormValues,
  ServicePlansFormOptions,
  ServicePlansListParams,
} from "./types";

export const list = async (params?: ServicePlansListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(CATALOG_SERVICE_PLANS_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        quotaType: params?.quotaType || undefined,
        isActive: params?.isActive || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(CATALOG_SERVICE_PLANS_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: ServicePlansFormOptions }> => {
  try {
    const res = await apiClient.get(CATALOG_SERVICE_PLANS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (
  payload: ServicePlanFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      CATALOG_SERVICE_PLANS_API.createOrUpdate(),
      {
        ...payload,
        code: payload.code.trim().toUpperCase(),
        description: payload.description?.trim() || null,
      },
      { params: { orgId: orgId || undefined } }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const update = async (
  id: string,
  payload: Partial<ServicePlanFormValues>,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const body = { ...payload };
    if (body.code) body.code = body.code.trim().toUpperCase();
    if (body.description !== undefined) {
      body.description = body.description?.trim() || undefined;
    }
    const res = await apiClient.post(CATALOG_SERVICE_PLANS_API.createOrUpdate(id), body, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(CATALOG_SERVICE_PLANS_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
