"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { SITES_API } from "./constant";
import type { SiteFormValues, SitesFormOptions, SitesListParams } from "./types";

export const list = async (params?: SitesListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(SITES_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        status: params?.status || undefined,
        stationSizeId: params?.stationSizeId || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(SITES_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: SitesFormOptions }> => {
  try {
    const res = await apiClient.get(SITES_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (payload: SiteFormValues, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      SITES_API.createOrUpdate(),
      {
        ...payload,
        code: payload.code.trim().toUpperCase(),
        location: payload.location?.trim() || null,
        address: payload.address?.trim() || null,
        portalBaseUrl: payload.portalBaseUrl?.trim() || null,
        nasIdentifier: payload.nasIdentifier?.trim() || null,
        radiusClientIp: payload.radiusClientIp?.trim() || null,
        radiusSecret: payload.radiusSecret?.trim() || null,
        vlanId: payload.vlanId?.trim() || null,
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
  payload: Partial<SiteFormValues>,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const body = { ...payload };
    if (body.code) body.code = body.code.trim().toUpperCase();
    const res = await apiClient.post(SITES_API.createOrUpdate(id), body, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(SITES_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
