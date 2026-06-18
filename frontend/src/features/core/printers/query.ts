"use server";
import { apiClient } from "@/lib/restapi/apiClient";

import { AxiosResponse } from "axios";
import { PRINTERS } from "./constant";
import { handleApiError } from "@/common/exceptions/handleApiError";
import { PaginationParams } from "@/common/interface/interface";
import { CommonListResponse, CommonResponse } from "@/common/interface/interface";

const API_ROUTES = PRINTERS;

const createPrinter = async (payload: any): Promise<CommonResponse> => {
  try {
    
    const res: AxiosResponse<any> = await apiClient.post<any>(API_ROUTES.createOrUpdate(""), payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
  console.log("Data",payload);
};

const updatePrinter = async (id: string, payload: any): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(API_ROUTES.createOrUpdate(id), payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const deletePrinter = async (id: string): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.delete<any>(API_ROUTES.delete(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getPrinters = async (id?: string, paginationParams?: PaginationParams): Promise<CommonListResponse | CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(API_ROUTES.listOrDetails(id), { params: paginationParams });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export { createPrinter, updatePrinter, deletePrinter, getPrinters };
