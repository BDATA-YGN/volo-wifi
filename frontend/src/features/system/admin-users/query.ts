"use server";

import { AxiosResponse } from "axios";
import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type {
  CommonListResponse,
  CommonResponse,
  PaginationParams,
} from "@/common/interface/interface";

import { ADMINS } from "./constant";

const API_ROUTES = ADMINS;

const createAdmin = async (payload: any): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(
      API_ROUTES.createOrUpdate(""),
      payload
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateAdmin = async (id: string, payload: any): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(
      API_ROUTES.createOrUpdate(id),
      payload
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteAdmin = async (id: string): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.delete<any>(API_ROUTES.delete(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getAdmins = async (
  id?: string,
  paginationParams?: PaginationParams
): Promise<CommonListResponse | CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(
      API_ROUTES.listOrDetails(id),
      { params: paginationParams }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export { createAdmin, updateAdmin, deleteAdmin, getAdmins };
