"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { NETWORK_RADIUS_PLAN_POLICIES_API } from "./constant";
import type { PlanPoliciesFormOptions, PlanPoliciesListParams, PlanPolicyFormValues } from "./types";

export const list = async (params?: PlanPoliciesListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_PLAN_POLICIES_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        planId: params?.planId || undefined,
        vendorProfileId: params?.vendorProfileId || undefined,
        phase: params?.phase || undefined,
        globalOnly: params?.globalOnly ? "true" : undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: PlanPoliciesFormOptions }> => {
  try {
    const res = await apiClient.get(NETWORK_RADIUS_PLAN_POLICIES_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (
  payload: PlanPolicyFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      NETWORK_RADIUS_PLAN_POLICIES_API.createOrUpdate(),
      {
        ...payload,
        wifiStationId: payload.wifiStationId || null,
        note: payload.note?.trim() || null,
      },
      { params: { orgId: orgId || payload.orgId || undefined } }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const update = async (
  id: string,
  payload: Partial<PlanPolicyFormValues>,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(NETWORK_RADIUS_PLAN_POLICIES_API.createOrUpdate(id), payload, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(NETWORK_RADIUS_PLAN_POLICIES_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
