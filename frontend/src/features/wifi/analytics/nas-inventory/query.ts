"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { ANALYTICS_NAS_INVENTORY_API } from "./constant";
import type {
  NasInventoryData,
  NasInventoryFormOptions,
  NasInventoryParams,
} from "./types";

export type NasInventoryResponse = CommonResponse & {
  data: NasInventoryData | null;
  meta?: Record<string, unknown>;
};

export const loadInventory = async (
  params?: NasInventoryParams
): Promise<NasInventoryResponse> => {
  try {
    const res = await apiClient.get(ANALYTICS_NAS_INVENTORY_API.listOrDetails(), {
      params: {
        orgId: params?.orgId || undefined,
        stationId: params?.stationId || undefined,
        type: params?.type || undefined,
        isRadiusClient:
          params?.isRadiusClient === undefined ? undefined : String(params.isRadiusClient),
        unassigned: params?.unassigned ? "true" : undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: NasInventoryFormOptions }> => {
  try {
    const res = await apiClient.get(ANALYTICS_NAS_INVENTORY_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
