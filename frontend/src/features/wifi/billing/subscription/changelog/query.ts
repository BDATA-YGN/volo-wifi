"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { BILLING_SUBSCRIPTION_CHANGELOG_API } from "./constant";
import type {
  ChangelogDetailPayload,
  ChangelogListPayload,
  ChangelogMeta,
  ChangelogQueryParams,
} from "./types";

export const listChangelogOrgs = async (): Promise<
  CommonResponse & { data: ChangelogListPayload; meta?: ChangelogMeta }
> => {
  try {
    const res = await apiClient.get(BILLING_SUBSCRIPTION_CHANGELOG_API.listOrDetails());
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadChangelog = async (
  params: ChangelogQueryParams
): Promise<CommonResponse & { data: ChangelogDetailPayload; meta?: ChangelogMeta }> => {
  try {
    const res = await apiClient.get(BILLING_SUBSCRIPTION_CHANGELOG_API.listOrDetails(), {
      params: {
        orgId: params.orgId,
        search: params.search || undefined,
        changeType: params.changeType || undefined,
        tierCode: params.tierCode || undefined,
        page: params.page,
        limit: params.limit,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
