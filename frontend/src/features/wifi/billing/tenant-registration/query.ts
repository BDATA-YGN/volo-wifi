"use server";

import { AxiosResponse } from "axios";
import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { TENANT_REGISTRATION_API } from "./constant";
import type {
  RegistrationPrerequisites,
  TenantRegistrationFormValues,
  TenantRegistrationResult,
} from "./types";

export async function getRegistrationPrerequisites(): Promise<RegistrationPrerequisites> {
  try {
    const res: AxiosResponse<CommonResponse<RegistrationPrerequisites>> =
      await apiClient.get(TENANT_REGISTRATION_API.prerequisites);
    return res.data.data as RegistrationPrerequisites;
  } catch (error) {
    throw handleApiError(error);
  }
}

function toPayload(values: TenantRegistrationFormValues) {
  return {
    org: {
      code: values.orgCode.trim().toUpperCase(),
      name: values.orgName.trim(),
      description: values.orgDescription?.trim() || null,
      timezone: values.timezone,
      currency: values.currency,
      stationCodePrefix: values.stationCodePrefix?.trim() || '',
      planCodePrefix: values.planCodePrefix?.trim() || '',
      resellerCodePrefix: values.resellerCodePrefix?.trim() || '',
    },
    license: {
      stationLimit: values.stationLimit,
      billingCycle: values.billingCycle,
      effectiveFrom: values.effectiveFrom,
      expiresAt: values.expiresAt || null,
      notes: values.licenseNotes?.trim() || null,
    },
    owner: {
      fullName: values.ownerFullName.trim(),
      username: values.ownerUsername.trim(),
      email: values.ownerEmail?.trim() || null,
      phoneNumber: values.ownerPhone?.trim() || null,
      password: values.ownerPassword,
    },
    usePlatformTierRates: values.usePlatformTierRates,
    tierRateOverrides: values.usePlatformTierRates ? undefined : values.tierRateOverrides,
  };
}

export async function registerTenant(
  values: TenantRegistrationFormValues
): Promise<TenantRegistrationResult> {
  try {
    const res: AxiosResponse<CommonResponse<TenantRegistrationResult>> =
      await apiClient.post(TENANT_REGISTRATION_API.register, toPayload(values));
    return res.data.data as TenantRegistrationResult;
  } catch (error) {
    throw handleApiError(error);
  }
}
