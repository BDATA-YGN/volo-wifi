"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse, PaginationParams } from "@/common/interface/interface";
import { NETWORK_RADIUS_PROFILES_API } from "./constant";
import type { RadiusProfileFormValues } from "./types";

export type RadiusProfilesListParams = PaginationParams & {
  orgId?: string;
  isActive?: boolean;
};

export const list = async (params?: RadiusProfilesListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_PROFILES_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        isActive:
          params?.isActive === true ? "true" : params?.isActive === false ? "false" : undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_PROFILES_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (
  payload: RadiusProfileFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      NETWORK_RADIUS_PROFILES_API.createOrUpdate(),
      {
        ...payload,
        serverHost: payload.serverHost?.trim() || null,
        community: payload.community?.trim() || null,
        note: payload.note?.trim() || null,
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
  payload: Partial<RadiusProfileFormValues>,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(NETWORK_RADIUS_PROFILES_API.createOrUpdate(id), payload, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(NETWORK_RADIUS_PROFILES_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
