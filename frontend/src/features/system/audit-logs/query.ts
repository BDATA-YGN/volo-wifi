"use server";

import { AxiosResponse } from "axios";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type {
  CommonListResponse,
  CommonResponse,
} from "@/common/interface/interface";

import { AUDIT_LOG_ROUTES } from "./constant";
import type { AuditListFilter, LoginListFilter } from "./interface";

const API = AUDIT_LOG_ROUTES;

const toAxiosParams = (input: Record<string, unknown> | undefined) => {
  if (!input) return undefined;
  const out: Record<string, unknown> = {};
  Object.entries(input).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v) && v.length === 0) return;
    out[k] = v;
  });
  return out;
};

export const getAuditLogs = async (
  filter: AuditListFilter = {},
): Promise<CommonListResponse> => {
  try {
    const { types, severities, ...rest } = filter;
    // Axios serialises `string[]` params in a way Express often collapses to
    // a single scalar — only the last value survives. The API expects either
    // repeated keys or a comma-separated list (see `parseList` in the audit
    // controller), so we always send CSV here.
    const res: AxiosResponse<any> = await apiClient.get(API.list(), {
      params: toAxiosParams({
        ...rest,
        types: types?.length ? types.join(",") : undefined,
        severities: severities?.length ? severities.join(",") : undefined,
        dateRange: filter.dateRange
          ? JSON.stringify(filter.dateRange)
          : undefined,
      }),
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getAuditLogById = async (id: string): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.detail(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getAuditOverview = async (): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.overview());
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getLoginLogs = async (
  filter: LoginListFilter = {},
): Promise<CommonListResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.loginList(), {
      params: toAxiosParams({
        ...filter,
        dateRange: filter.dateRange
          ? JSON.stringify(filter.dateRange)
          : undefined,
      }),
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getLoginOverview = async (): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.loginOverview());
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getRetentionPreview = async (): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.retention());
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
