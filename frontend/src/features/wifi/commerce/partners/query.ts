"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { COMMERCE_PARTNERS_API } from "./constant";
import type {
  PartnerFormValues,
  PartnersFormOptions,
  PartnersListParams,
} from "./types";

export const list = async (params?: PartnersListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(COMMERCE_PARTNERS_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        status: params?.status || undefined,
        stationId: params?.stationId || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(COMMERCE_PARTNERS_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: PartnersFormOptions }> => {
  try {
    const res = await apiClient.get(COMMERCE_PARTNERS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (
  payload: PartnerFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      COMMERCE_PARTNERS_API.createOrUpdate(),
      {
        ...payload,
        code: payload.code.trim().toUpperCase(),
        phone: payload.phone?.trim() || null,
        email: payload.email?.trim() || null,
        address: payload.address?.trim() || null,
        planEntitlements: payload.planEntitlements.filter((e) => e.isEnabled),
        loginUsername: payload.loginUsername?.trim(),
        loginPassword: payload.loginPassword,
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
  payload: Partial<PartnerFormValues>,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const body: Record<string, unknown> = { ...payload };
    if (body.code && typeof body.code === "string") {
      body.code = body.code.trim().toUpperCase();
    }
    if (body.planEntitlements && Array.isArray(body.planEntitlements)) {
      body.planEntitlements = (body.planEntitlements as PartnerFormValues["planEntitlements"]).filter(
        (e) => e.isEnabled
      );
    }
    const res = await apiClient.post(COMMERCE_PARTNERS_API.createOrUpdate(id), body, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(COMMERCE_PARTNERS_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
