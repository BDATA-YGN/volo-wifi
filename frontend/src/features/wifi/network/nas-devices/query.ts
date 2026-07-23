"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { NETWORK_NAS_DEVICES_API } from "./constant";
import type {
  NasDeviceFormValues,
  NasDevicesFormOptions,
  NasDevicesListParams,
} from "./types";

export const list = async (params?: NasDevicesListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(NETWORK_NAS_DEVICES_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        stationId: params?.stationId || undefined,
        vendor: params?.vendor || undefined,
        type: params?.type || undefined,
        isRadiusClient:
          params?.isRadiusClient === true
            ? "true"
            : params?.isRadiusClient === false
              ? "false"
              : undefined,
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
): Promise<CommonResponse & { data: NasDevicesFormOptions }> => {
  try {
    const res = await apiClient.get(NETWORK_NAS_DEVICES_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(NETWORK_NAS_DEVICES_API.listOrDetails(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (
  payload: NasDeviceFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(NETWORK_NAS_DEVICES_API.createOrUpdate(), {
      ...payload,
      stationId: payload.stationId,
      vendor: payload.vendor?.trim() || null,
      model: payload.model?.trim() || null,
      serialNo: payload.serialNo?.trim() || null,
      macAddr: payload.macAddr?.trim() || null,
      ipAddr: payload.ipAddr?.trim() || null,
      note: payload.note?.trim() || null,
      radiusProfileId: payload.isRadiusClient ? payload.radiusProfileId || null : null,
      radiusSecret: payload.radiusSecret?.trim() || null,
      nasShortname: payload.nasShortname?.trim() || null,
    }, {
      params: { orgId: orgId || payload.orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const update = async (
  id: string,
  payload: Partial<NasDeviceFormValues>,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const body: Record<string, unknown> = { ...payload };
    if (body.stationId === "") body.stationId = null;

    // Never send empty RADIUS clears on edit — omit so the API keeps existing values.
    if (body.radiusSecret === "" || body.radiusSecret == null) {
      delete body.radiusSecret;
    }
    if (body.nasShortname === "") {
      delete body.nasShortname;
    }
    if (body.radiusProfileId === "" || body.radiusProfileId == null) {
      delete body.radiusProfileId;
    }

    const res = await apiClient.post(NETWORK_NAS_DEVICES_API.createOrUpdate(id), body, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(NETWORK_NAS_DEVICES_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
