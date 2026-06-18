"use server";
import { apiClient } from "../../../lib/restapi/apiClient";

import { AxiosResponse } from "axios";
import { THEMES } from "./constant";
import { handleApiError } from "@/common/exceptions/handleApiError";
import { PaginationParams } from "@/common/interface/interface";
import { CommonListResponse, CommonResponse } from "@/common/interface/interface";

const API_ROUTES = THEMES;

const createTheme = async (payload: any): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(API_ROUTES.createOrUpdate(""), payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateTheme = async (id: string, payload: any): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(API_ROUTES.createOrUpdate(id), payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteTheme = async (id: string): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.delete<any>(API_ROUTES.delete(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getThemes = async (id?: string, paginationParams?: PaginationParams): Promise<CommonListResponse | CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(API_ROUTES.listOrDetails(id), { params: paginationParams });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export { createTheme, updateTheme, deleteTheme, getThemes };
