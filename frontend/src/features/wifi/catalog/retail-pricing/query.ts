"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { CATALOG_RETAIL_PRICING_API } from "./constant";
import type {
  PlanPriceFormValues,
  PlanPriceUpdateValues,
  PriceBookFormValues,
  RetailPricingFormOptions,
  RetailPricingListParams,
} from "./types";

export const list = async (params?: RetailPricingListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(CATALOG_RETAIL_PRICING_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        scope: params?.scope || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getBookById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(CATALOG_RETAIL_PRICING_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: RetailPricingFormOptions }> => {
  try {
    const res = await apiClient.get(CATALOG_RETAIL_PRICING_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const createBook = async (
  payload: PriceBookFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(CATALOG_RETAIL_PRICING_API.createOrUpdate(), payload, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateBook = async (
  id: string,
  payload: Partial<PriceBookFormValues>,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(CATALOG_RETAIL_PRICING_API.createOrUpdate(id), payload, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const removeBook = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(CATALOG_RETAIL_PRICING_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const createPrice = async (
  payload: PlanPriceFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(CATALOG_RETAIL_PRICING_API.upsertPrice(), payload, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updatePrice = async (
  id: string,
  payload: PlanPriceUpdateValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(CATALOG_RETAIL_PRICING_API.upsertPrice(id), payload, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const removePrice = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(CATALOG_RETAIL_PRICING_API.deletePrice(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
