"use server";
import { apiClient } from "@/lib/restapi/apiClient";

import { AxiosResponse } from "axios";
import { MAP_ROLE_SETTINGS, MNG_ROLES, MNG_ROLE_SETTINGS } from "./constant";
import { handleApiError } from "@/common/exceptions/handleApiError";
import { PaginationParams } from "@/common/interface/interface";
import { CommonListResponse, CommonResponse } from "@/common/interface/interface";

const createMapRoleSetting = async (payload: any): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(
      MAP_ROLE_SETTINGS.createOrUpdate(''),
      payload
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateMapRoleSetting = async (id: string, payload: any): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(
      MAP_ROLE_SETTINGS.createOrUpdate(id),
      payload
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteMapRoleSetting = async (id: string): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.delete<any>(
      MAP_ROLE_SETTINGS.delete(id)
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getMapRoleSettings = async (id?: string, paginationParams?: PaginationParams): Promise<CommonListResponse | CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(
      MAP_ROLE_SETTINGS.listOrDetails(id),
      { params: paginationParams }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createMngRole = async (payload: any): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(
      MNG_ROLES.createOrUpdate(''),
      payload
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateMngRole = async (id: string, payload: any): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(
      MNG_ROLES.createOrUpdate(id),
      payload
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteMngRole = async (id: string): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.delete<any>(
      MNG_ROLES.delete(id)
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getMngRoles = async (id?: string, paginationParams?: PaginationParams): Promise<CommonListResponse | CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(
      MNG_ROLES.listOrDetails(id),
      { params: paginationParams }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createMngRoleSetting = async (payload: any): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(
      MNG_ROLE_SETTINGS.createOrUpdate(''),
      payload
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateMngRoleSetting = async (id: string, payload: any): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(
      MNG_ROLE_SETTINGS.createOrUpdate(id),
      payload
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteMngRoleSetting = async (id: string): Promise<CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.delete<any>(
      MNG_ROLE_SETTINGS.delete(id)
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getMngRoleSettings = async (id?: string, paginationParams?: PaginationParams): Promise<CommonListResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(
      MNG_ROLE_SETTINGS.listOrDetails(id),
      { params: {...paginationParams} }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};


export {
  createMapRoleSetting,
  updateMapRoleSetting,
  deleteMapRoleSetting,
  getMapRoleSettings,
  createMngRole,
  updateMngRole,
  deleteMngRole,
  getMngRoles,
  createMngRoleSetting,
  updateMngRoleSetting,
  deleteMngRoleSetting,
  getMngRoleSettings,
};
