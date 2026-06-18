"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse, PaginationParams } from "@/common/interface/interface";
import { NETWORK_RADIUS_ATTRIBUTE_CATALOG_API } from "./constant";
import type { AttributeFormValues, RadiusAttrValueType } from "./types";

export type AttributeCatalogListParams = PaginationParams & {
  valueType?: RadiusAttrValueType;
  orgId?: string;
};

export const list = async (params?: AttributeCatalogListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_ATTRIBUTE_CATALOG_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        valueType: params?.valueType || undefined,
        orgId: params?.orgId || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_ATTRIBUTE_CATALOG_API.listOrDetails(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (
  payload: AttributeFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      NETWORK_RADIUS_ATTRIBUTE_CATALOG_API.createOrUpdate(),
      {
        ...payload,
        defaultValue: payload.defaultValue?.trim() || null,
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
  payload: Partial<AttributeFormValues>,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      NETWORK_RADIUS_ATTRIBUTE_CATALOG_API.createOrUpdate(id),
      payload,
      { params: { orgId: orgId || undefined } }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(NETWORK_RADIUS_ATTRIBUTE_CATALOG_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
