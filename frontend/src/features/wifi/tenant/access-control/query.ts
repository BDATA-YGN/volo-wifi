"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { TENANT_ACCESS_CONTROL_API } from "./constant";
import type {
  AccessControlFormOptions,
  AccessControlListParams,
  MemberCreateFormValues,
  MemberUpdateFormValues,
  OrgMemberRecord,
} from "./types";

export const list = async (params?: AccessControlListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(TENANT_ACCESS_CONTROL_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        status: params?.status || undefined,
        roleCode: params?.roleCode || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(TENANT_ACCESS_CONTROL_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: AccessControlFormOptions }> => {
  try {
    const res = await apiClient.get(TENANT_ACCESS_CONTROL_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (
  payload: MemberCreateFormValues,
  orgId?: string
): Promise<CommonResponse & { data: OrgMemberRecord }> => {
  try {
    const { confirmPassword: _confirm, ...body } = payload;
    const res = await apiClient.post(TENANT_ACCESS_CONTROL_API.createOrUpdate(), body, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const update = async (
  id: string,
  payload: MemberUpdateFormValues,
  orgId?: string
): Promise<CommonResponse & { data: OrgMemberRecord }> => {
  try {
    const res = await apiClient.post(TENANT_ACCESS_CONTROL_API.createOrUpdate(id), payload, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const resetPassword = async (
  id: string,
  password: string,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      TENANT_ACCESS_CONTROL_API.resetPassword(id),
      { password },
      { params: { orgId: orgId || undefined } }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(TENANT_ACCESS_CONTROL_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
