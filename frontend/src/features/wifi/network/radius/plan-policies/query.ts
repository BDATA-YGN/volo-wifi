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

export const saveGroup = async (
  payload: PlanPolicyFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      NETWORK_RADIUS_PLAN_POLICIES_API.createOrUpdate(),
      {
        orgId: payload.orgId,
        planId: payload.planId,
        vendorProfileId: payload.vendorProfileId,
        stationIds: payload.stationIds ?? [],
        policyBundleId: payload.policyBundleId,
        attributes: payload.attributes.map((row) => ({
          phase: row.phase,
          attributeName: row.attributeName.trim(),
          op: row.op,
          valueType: row.valueType,
          value: row.value.trim(),
          priority: row.priority,
          note: row.note?.trim() || null,
        })),
      },
      { params: { orgId: orgId || payload.orgId || undefined } }
    );
    return { message: res.data?.message ?? "Saved", data: null };
  } catch (error) {
    throw handleApiError(error);
  }
};

export const removeGroup = async (
  group: { policyBundleId: string },
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(`${NETWORK_RADIUS_PLAN_POLICIES_API.listOrDetails()}/group`, {
      params: {
        orgId: orgId || undefined,
        policyBundleId: group.policyBundleId,
      },
    });
    return { message: res.data?.message ?? "Removed", data: null };
  } catch (error) {
    throw handleApiError(error);
  }
};
