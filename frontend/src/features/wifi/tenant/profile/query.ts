"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { TENANT_PROFILE_API } from "./constant";
import type { OrgMembershipOption, TenantProfile, TenantProfileFormValues, TenantProfileMeta } from "./types";

export type ProfileResponse = CommonResponse & {
  data: TenantProfile | null;
  meta?: TenantProfileMeta;
};

export const loadProfile = async (orgId?: string): Promise<ProfileResponse> => {
  try {
    const res = await apiClient.get(TENANT_PROFILE_API.listOrDetails(), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadMemberships = async (): Promise<
  CommonResponse & { data: { memberships: OrgMembershipOption[] } }
> => {
  try {
    const res = await apiClient.get(TENANT_PROFILE_API.listOrDetails(), {
      params: { formOptions: "true" },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateProfile = async (
  payload: TenantProfileFormValues,
  orgId?: string
): Promise<ProfileResponse> => {
  try {
    const res = await apiClient.post(TENANT_PROFILE_API.createOrUpdate(), payload, {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
