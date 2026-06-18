"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse, PaginationParams } from "@/common/interface/interface";
import { BILLING_CAPACITY_TIERS_API } from "./constant";
import type { CapacityTierFormValues } from "./types";

export const list = async (params?: PaginationParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(BILLING_CAPACITY_TIERS_API.listOrDetails(), { params });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(BILLING_CAPACITY_TIERS_API.listOrDetails(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (payload: CapacityTierFormValues): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(BILLING_CAPACITY_TIERS_API.createOrUpdate(), {
      ...payload,
      code: payload.code.trim().toUpperCase(),
      description: payload.description?.trim() || null,
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const update = async (
  id: string,
  payload: Partial<CapacityTierFormValues>
): Promise<CommonResponse> => {
  try {
    const body = { ...payload };
    if (body.code) body.code = body.code.trim().toUpperCase();
    if (body.description !== undefined) {
      body.description = body.description?.trim() || undefined;
    }
    const res = await apiClient.post(BILLING_CAPACITY_TIERS_API.createOrUpdate(id), body);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(BILLING_CAPACITY_TIERS_API.delete(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
