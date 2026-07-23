"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { ACCESS_VOUCHER_RUNS_API } from "./constant";
import type {
  VoucherRunFormValues,
  VoucherRunsFormOptions,
  VoucherRunsListParams,
} from "./types";

export const list = async (params?: VoucherRunsListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(ACCESS_VOUCHER_RUNS_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        planId: params?.planId || undefined,
        stationId: params?.stationId || undefined,
        township: params?.township || undefined,
        stationSizeId: params?.stationSizeId || undefined,
        dateFrom: params?.dateFrom || undefined,
        dateTo: params?.dateTo || undefined,
        hasBalance: params?.hasBalance ? "true" : undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(ACCESS_VOUCHER_RUNS_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: VoucherRunsFormOptions }> => {
  try {
    const res = await apiClient.get(ACCESS_VOUCHER_RUNS_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (
  payload: VoucherRunFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      ACCESS_VOUCHER_RUNS_API.createOrUpdate(),
      {
        ...payload,
        batchNo: payload.batchNo?.trim().toUpperCase() || undefined,
        note: payload.note?.trim() || null,
      },
      { params: { orgId: orgId || undefined } }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateNote = async (
  id: string,
  note: string | null,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      ACCESS_VOUCHER_RUNS_API.createOrUpdate(id),
      { note },
      { params: { orgId: orgId || undefined } }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const cancel = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(ACCESS_VOUCHER_RUNS_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
