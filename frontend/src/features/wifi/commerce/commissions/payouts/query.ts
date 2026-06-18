"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { COMMERCE_COMMISSIONS_PAYOUTS_API } from "./constant";
import type {
  PayoutFormValues,
  PayoutPreview,
  PayoutsFormOptions,
  PayoutsListParams,
  PayoutStatusUpdate,
} from "./types";
import { payloadFromForm } from "./utils";

export const list = async (params?: PayoutsListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(COMMERCE_COMMISSIONS_PAYOUTS_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        status: params?.status || undefined,
        resellerId: params?.resellerId || undefined,
        periodFrom: params?.periodFrom || undefined,
        periodTo: params?.periodTo || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(COMMERCE_COMMISSIONS_PAYOUTS_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: PayoutsFormOptions }> => {
  try {
    const res = await apiClient.get(COMMERCE_COMMISSIONS_PAYOUTS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const preview = async (
  resellerId: string,
  periodFrom: string,
  periodTo: string,
  orgId?: string
): Promise<CommonResponse & { data: PayoutPreview }> => {
  try {
    const res = await apiClient.get(COMMERCE_COMMISSIONS_PAYOUTS_API.listOrDetails(), {
      params: {
        preview: "true",
        resellerId,
        periodFrom,
        periodTo,
        orgId: orgId || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (
  payload: {
    resellerId: string;
    periodFrom: string;
    periodTo: string;
    generate: boolean;
    amount?: number;
    note?: string;
  },
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(COMMERCE_COMMISSIONS_PAYOUTS_API.createOrUpdate(), payload, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateStatus = async (
  id: string,
  payload: PayoutStatusUpdate,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      COMMERCE_COMMISSIONS_PAYOUTS_API.createOrUpdate(id),
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
    const res = await apiClient.delete(COMMERCE_COMMISSIONS_PAYOUTS_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
