"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { COMMERCE_PARTNERS_WORKSPACE_API } from "./constant";
import type { WorkspaceDashboard, WorkspaceFormOptions, WorkspaceParams } from "./types";

type WorkspaceResponse = CommonResponse & {
  data: WorkspaceDashboard | null;
  meta?: Record<string, unknown>;
};

export const loadDashboard = async (params?: WorkspaceParams): Promise<WorkspaceResponse> => {
  try {
    const res = await apiClient.get(COMMERCE_PARTNERS_WORKSPACE_API.listOrDetails(), {
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
  orgId?: string
): Promise<CommonResponse & { data: WorkspaceFormOptions }> => {
  try {
    const res = await apiClient.get(COMMERCE_PARTNERS_WORKSPACE_API.listOrDetails(), {
      params: { formOptions: "true", orgId: orgId || undefined },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
