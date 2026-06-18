"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse } from "@/common/interface/interface";
import { COMMERCE_COMMISSIONS_RULES_API } from "./constant";
import type { RulesFormOptions, RulesListParams } from "./types";
import { payloadFromForm } from "./utils";
import type { CommissionRuleFormValues } from "./types";

export const list = async (params?: RulesListParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(COMMERCE_COMMISSIONS_RULES_API.listOrDetails(), {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search || undefined,
        orgId: params?.orgId || undefined,
        type: params?.type || undefined,
        resellerId: params?.resellerId || undefined,
        planId: params?.planId || undefined,
        isActive:
          params?.isActive === true ? "true" : params?.isActive === false ? "false" : undefined,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(COMMERCE_COMMISSIONS_RULES_API.listOrDetails(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadFormOptions = async (
  orgId?: string
): Promise<CommonResponse & { data: RulesFormOptions }> => {
  try {
    const res = await apiClient.get(COMMERCE_COMMISSIONS_RULES_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const create = async (
  payload: CommissionRuleFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      COMMERCE_COMMISSIONS_RULES_API.createOrUpdate(),
      payloadFromForm(payload),
      { params: { orgId: orgId || undefined } }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const update = async (
  id: string,
  payload: CommissionRuleFormValues,
  orgId?: string
): Promise<CommonResponse> => {
  try {
    const res = await apiClient.post(
      COMMERCE_COMMISSIONS_RULES_API.createOrUpdate(id),
      payloadFromForm(payload),
      { params: { orgId: orgId || undefined } }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const remove = async (id: string, orgId?: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.delete(COMMERCE_COMMISSIONS_RULES_API.delete(id), {
      params: { orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
