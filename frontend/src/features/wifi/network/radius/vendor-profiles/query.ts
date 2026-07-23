"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse, PaginationParams } from "@/common/interface/interface";
import { NETWORK_RADIUS_VENDOR_PROFILES_API } from "./constant";
import type { CatalogAttribute, VendorProfileFormValues } from "./types";

function normalizeProfilePayload(payload: Partial<VendorProfileFormValues>) {
  const supportsCoA = payload.supportsCoA;
  return {
    ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    ...(payload.vendor !== undefined ? { vendor: payload.vendor.trim() } : {}),
    ...(payload.model !== undefined ? { model: payload.model?.trim() || null } : {}),
    ...(payload.description !== undefined
      ? { description: payload.description?.trim() || null }
      : {}),
    ...(supportsCoA !== undefined ? { supportsCoA } : {}),
    ...(payload.coaPort !== undefined || supportsCoA !== undefined
      ? {
          coaPort: supportsCoA === false ? null : payload.coaPort ?? 3799,
        }
      : {}),
    ...(payload.supportedAttributes !== undefined
      ? {
          supportedAttributes: payload.supportedAttributes.map((row) => ({
            attributeId: row.attributeId,
            requirement: row.requirement,
          })),
        }
      : {}),
  };
}

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

export const getById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_VENDOR_PROFILES_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
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
      normalizeProfilePayload(payload),
      { params: { orgId: orgId || undefined } }
    );
    // Slim return — full detail is reloaded via list/getById (avoids Server Action flight issues).
    return { message: res.data?.message ?? "Vendor profile created", data: null };
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
      normalizeProfilePayload(payload),
      { params: { orgId: orgId || undefined } }
    );
    return { message: res.data?.message ?? "Vendor profile updated", data: null };
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(NETWORK_RADIUS_VENDOR_PROFILES_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return { message: res.data?.message ?? "Vendor profile removed", data: null };
  } catch (error) {
    throw handleApiError(error);
  }
};
