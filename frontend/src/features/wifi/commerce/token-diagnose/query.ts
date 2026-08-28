"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError, toActionFailure } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { COMMERCE_TOKEN_DIAGNOSE_API } from "./constant";
import type { DiagnoseFormOptions, DiagnoseResult } from "./types";
import { COMMERCE_ACCESS_TOKENS_API } from "@/features/wifi/commerce/access-tokens/constant";
import type { CredentialLifecycleAction } from "@/features/wifi/commerce/access-tokens/types";

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: DiagnoseFormOptions }> => {
  try {
    const res = await apiClient.get(COMMERCE_TOKEN_DIAGNOSE_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const diagnose = async (params: {
  code: string;
  orgId?: string;
  resellerId?: string;
}): Promise<CommonResponse & { data: DiagnoseResult | null }> => {
  try {
    const res = await apiClient.get(COMMERCE_TOKEN_DIAGNOSE_API.listOrDetails(), {
      params: {
        code: params.code,
        orgId: params.orgId || undefined,
        resellerId: params.resellerId || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const applyAllowNewDevice = async (params: {
  tokenId: string;
  orgId?: string;
  resellerId?: string;
}): Promise<CommonResponse | null> => {
  return applyDiagnoseTokenAction({ ...params, action: "allowNewDevice" });
};

export const applyDiagnoseTokenAction = async (params: {
  tokenId: string;
  action: CredentialLifecycleAction;
  orgId?: string;
  resellerId?: string;
}): Promise<CommonResponse | null> => {
  try {
    const res = await apiClient.post(
      COMMERCE_ACCESS_TOKENS_API.action(params.tokenId),
      { action: params.action },
      {
        params: {
          orgId: params.orgId || undefined,
          resellerId: params.resellerId || undefined,
        },
      },
    );
    return res.data ?? null;
  } catch (error) {
    return toActionFailure(error, "Failed to update token");
  }
};
