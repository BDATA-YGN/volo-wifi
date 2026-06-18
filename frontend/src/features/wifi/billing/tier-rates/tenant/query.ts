"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { BILLING_TIER_RATES_TENANT_API } from "./constant";
import type { OrgSummary, TenantOverrideFormValues, TenantRatesOrgPayload } from "./types";

export const listOrgs = async (): Promise<
  CommonResponse & { data: { orgs: OrgSummary[] }; meta?: Record<string, unknown> }
> => {
  try {
    const res = await apiClient.get(BILLING_TIER_RATES_TENANT_API.listOrDetails());
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadTenantRates = async (
  orgId: string
): Promise<CommonResponse & { data: TenantRatesOrgPayload; meta?: Record<string, unknown> }> => {
  try {
    const res = await apiClient.get(BILLING_TIER_RATES_TENANT_API.listOrDetails(), {
      params: { orgId },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (payload: TenantOverrideFormValues): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(BILLING_TIER_RATES_TENANT_API.createOrUpdate(), {
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
  payload: Partial<TenantOverrideFormValues>
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(BILLING_TIER_RATES_TENANT_API.createOrUpdate(id), payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(BILLING_TIER_RATES_TENANT_API.delete(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
