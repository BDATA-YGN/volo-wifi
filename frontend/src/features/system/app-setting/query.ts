"use server";

import { AxiosResponse } from "axios";
import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type {
  CommonListResponse,
  CommonResponse,
} from "@/common/interface/interface";

import { APP_SETTING_ROUTES } from "./constant";
import type { AppSettingAttributes } from "./interface";

const API = APP_SETTING_ROUTES;

export const getAppSettings = async (
  params?: { category?: string; page?: number; limit?: number }
): Promise<CommonListResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.listOrDetails(), { params });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getAppSettingById = async (id: string): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.listOrDetails(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getAppSettingByKey = async (key: string): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get(API.getByKey(key));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const saveAppSetting = async (
  payload: Partial<AppSettingAttributes>,
  id?: string
): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post(API.createOrUpdate(id), payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteAppSetting = async (id: string): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.delete(API.delete(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
