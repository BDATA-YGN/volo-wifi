"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { COMMERCE_ACCESS_TOKENS_API } from "./constant";
import type {
  AccessTokenRecord,
  AccessTokensFormOptions,
  AccessTokensListParams,
  CredentialLifecycleAction,
  IssueTokenFormValues,
} from "./types";

export const list = async (params?: AccessTokensListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(COMMERCE_ACCESS_TOKENS_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        resellerId: params?.resellerId || undefined,
        status: params?.status || undefined,
        planId: params?.planId || undefined,
        stationId: params?.stationId || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (
  id: string,
  params?: Pick<AccessTokensListParams, "orgId" | "resellerId">
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(COMMERCE_ACCESS_TOKENS_API.listOrDetails(id), {
      params: {
        orgId: params?.orgId || undefined,
        resellerId: params?.resellerId || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string,
  resellerId?: string
): Promise<CommonResponse & { data: AccessTokensFormOptions }> => {
  try {
    const res = await apiClient.get(COMMERCE_ACCESS_TOKENS_API.listOrDetails(), {
      params: {
        formOptions: "true",
        orgId: orgId || undefined,
        resellerId: resellerId || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const issue = async (
  payload: IssueTokenFormValues,
  params?: Pick<AccessTokensListParams, "orgId" | "resellerId">
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      COMMERCE_ACCESS_TOKENS_API.createOrUpdate(),
      {
        ...payload,
        note: payload.note?.trim() || null,
      },
      {
        params: {
          orgId: params?.orgId || undefined,
          resellerId: params?.resellerId || undefined,
        },
      }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const applyAction = async (
  id: string,
  action: CredentialLifecycleAction,
  params?: Pick<AccessTokensListParams, "orgId" | "resellerId">
): Promise<CommonResponse & { data: AccessTokenRecord }> => {
  try {
    const res = await apiClient.post(
      COMMERCE_ACCESS_TOKENS_API.action(id),
      { action },
      {
        params: {
          orgId: params?.orgId || undefined,
          resellerId: params?.resellerId || undefined,
        },
      }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteSession = async (
  tokenId: string,
  sessionId: string,
  source: "hot" | "archive" | "captive",
  params?: Pick<AccessTokensListParams, "orgId" | "resellerId">
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(
      `${COMMERCE_ACCESS_TOKENS_API.listOrDetails(tokenId)}/sessions/${sessionId}`,
      {
        params: {
          source,
          orgId: params?.orgId || undefined,
          resellerId: params?.resellerId || undefined,
        },
      }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const revoke = async (
  id: string,
  params?: Pick<AccessTokensListParams, "orgId" | "resellerId">
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(COMMERCE_ACCESS_TOKENS_API.delete(id), {
      params: {
        orgId: params?.orgId || undefined,
        resellerId: params?.resellerId || undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
