"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { BILLING_SUBSCRIPTION_API } from "./constant";
import type {
  SubscriptionDetailPayload,
  SubscriptionListPayload,
  SubscriptionUpdateFormValues,
} from "./types";

export const listSubscriptions = async (): Promise<
  CommonResponse & { data: SubscriptionListPayload; meta?: Record<string, unknown> }
> => {
  try {
    const res = await apiClient.get(BILLING_SUBSCRIPTION_API.listOrDetails());
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadSubscription = async (
  orgId: string
): Promise<CommonResponse & { data: SubscriptionDetailPayload }> => {
  try {
    const res = await apiClient.get(BILLING_SUBSCRIPTION_API.listOrDetails(), {
      params: { orgId },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateSubscription = async (
  licenseId: string,
  payload: Partial<SubscriptionUpdateFormValues>
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      BILLING_SUBSCRIPTION_API.createOrUpdate(licenseId),
      payload
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
