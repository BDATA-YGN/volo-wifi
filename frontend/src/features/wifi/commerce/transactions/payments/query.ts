"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { COMMERCE_TRANSACTIONS_PAYMENTS_API } from "./constant";
import type { PaymentsFormOptions, PaymentsListParams } from "./types";

export const list = async (params?: PaymentsListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(COMMERCE_TRANSACTIONS_PAYMENTS_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        resellerId: params?.resellerId || undefined,
        method: params?.method || undefined,
        stationId: params?.stationId || undefined,
        orderStatus: params?.orderStatus || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (
  id: string,
  params?: Pick<PaymentsListParams, "orgId" | "resellerId">
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(COMMERCE_TRANSACTIONS_PAYMENTS_API.listOrDetails(id), {
      params: {
        orgId: params?.orgId || undefined,
        resellerId: params?.resellerId || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: PaymentsFormOptions }> => {
  try {
    const res = await apiClient.get(COMMERCE_TRANSACTIONS_PAYMENTS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
