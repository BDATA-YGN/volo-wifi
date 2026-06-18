"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_SITE_INVENTORY_API } from "./constant";
import type {
  SiteInventoryData,
  SiteInventoryFormOptions,
  SiteInventoryParams,
} from "./types";

export type SiteInventoryResponse = CommonResponse & {
  data: SiteInventoryData | null;
  meta?: Record<string, unknown>;
};

export const loadInventory = async (
  params?: SiteInventoryParams
): Promise<SiteInventoryResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_SITE_INVENTORY_API.listOrDetails(), {
      params: {
        orgId: params?.orgId || undefined,
        stationId: params?.stationId || undefined,
        stationSizeId: params?.stationSizeId || undefined,
        status: params?.status || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: SiteInventoryFormOptions }> => {
  try {
    const res = await apiClient.get(ANALYTICS_SITE_INVENTORY_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
