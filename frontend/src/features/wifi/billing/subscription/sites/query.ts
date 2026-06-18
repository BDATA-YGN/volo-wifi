"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { BILLING_SUBSCRIPTION_SITES_API } from "./constant";
import type {
  LicensedSitesDetailPayload,
  LicensedSitesListPayload,
  LicensedSitesMeta,
  LicensedSitesQueryParams,
} from "./types";

export const listLicensedSitesOrgs = async (): Promise<
  CommonResponse & { data: LicensedSitesListPayload; meta?: LicensedSitesMeta }
> => {
  try {
    const res = await apiClient.get(BILLING_SUBSCRIPTION_SITES_API.listOrDetails());
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadLicensedSites = async (
  params: LicensedSitesQueryParams
): Promise<CommonResponse & { data: LicensedSitesDetailPayload; meta?: LicensedSitesMeta }> => {
  try {
    const res = await apiClient.get(BILLING_SUBSCRIPTION_SITES_API.listOrDetails(), {
      params: {
        orgId: params.orgId,
        search: params.search || undefined,
        tierCode: params.tierCode || undefined,
        billableOnly: params.billableOnly === false ? "false" : undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
