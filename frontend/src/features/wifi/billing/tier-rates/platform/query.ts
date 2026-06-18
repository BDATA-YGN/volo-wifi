"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { BILLING_TIER_RATES_PLATFORM_API } from "./constant";
import type { PlatformRateFormValues, PlatformRatesPayload } from "./types";

export type PlatformRatesResponse = CommonResponse & {
  data: PlatformRatesPayload;
  meta?: PlatformRatesPayload extends never ? never : Record<string, unknown>;
};

export const loadPlatformRates = async (): Promise<PlatformRatesResponse> => {
  try {
    const res = await apiClient.get(BILLING_TIER_RATES_PLATFORM_API.listOrDetails());
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(BILLING_TIER_RATES_PLATFORM_API.listOrDetails(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (payload: PlatformRateFormValues): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(BILLING_TIER_RATES_PLATFORM_API.createOrUpdate(), {
      ...payload,
      billingCycle: "MONTHLY",
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const update = async (
  id: string,
  payload: Partial<PlatformRateFormValues>
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(BILLING_TIER_RATES_PLATFORM_API.createOrUpdate(id), payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(BILLING_TIER_RATES_PLATFORM_API.delete(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
