"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse, PaginationParams } from "@/common/interface/interface";
import { NETWORK_RADIUS_VENDOR_PROFILES_API } from "./constant";
import type { CatalogAttribute, VendorProfileFormValues } from "./types";

export const list = async (
  params?: PaginationParams & { orgId?: string }
): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_VENDOR_PROFILES_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadCatalog = async (
  orgId?: string
): Promise<CommonResponse & { data: { attributes: CatalogAttribute[] } }> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_VENDOR_PROFILES_API.listOrDetails(), {
      params: { catalog: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_VENDOR_PROFILES_API.listOrDetails(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (
  payload: VendorProfileFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      NETWORK_RADIUS_VENDOR_PROFILES_API.createOrUpdate(),
      {
        ...payload,
        model: payload.model?.trim() || null,
        description: payload.description?.trim() || null,
        coaPort: payload.supportsCoA ? payload.coaPort ?? 3799 : null,
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
  payload: Partial<VendorProfileFormValues>,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      NETWORK_RADIUS_VENDOR_PROFILES_API.createOrUpdate(id),
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
    const res = await apiClient.delete(NETWORK_RADIUS_VENDOR_PROFILES_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
