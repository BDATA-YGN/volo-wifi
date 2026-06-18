"use server";
import { handleApiError } from "@/common/exceptions/handleApiError";
import { AxiosResponse } from "axios";
import { apiClient } from "@/lib/restapi/apiClient";
import { MENU_API_ROUTES } from "./constant";
import { MenuGroup, MenuItem, CreateMenuGroupInput, UpdateMenuGroupInput, CreateMenuItemInput, UpdateMenuItemInput, UpdatePositionsInput } from "./types";
import { MenuGroupFormData } from "./types";

const getAllMenuGroups = async (): Promise<MenuGroup[]> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(MENU_API_ROUTES.getAllMenuGroups);
    return res.data?.data as MenuGroup[] || [];
  } catch (error) {
    throw handleApiError(error);
  }
};

const getSingleMenuGroup = async (id: number | string): Promise<MenuGroup> => {
  try {
    const res: AxiosResponse<MenuGroup> = await apiClient.get<MenuGroup>(MENU_API_ROUTES.getSingleMenuGroup(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createMenuGroup = async (data: MenuGroupFormData): Promise<MenuGroup> => {
  try {
    const res: AxiosResponse<MenuGroup> = await apiClient.post<MenuGroup>(MENU_API_ROUTES.createMenuGroup, data);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateMenuGroup = async (id: number | string, data: MenuGroupFormData): Promise<MenuGroup> => {
  try {
    const res: AxiosResponse<MenuGroup> = await apiClient.put<MenuGroup>(MENU_API_ROUTES.updateMenuGroup(id), data);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteMenuGroup = async (id: number | string): Promise<void> => {
  try {
    await apiClient.delete<void>(MENU_API_ROUTES.deleteMenuGroup(id));
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateMenuGroupPositions = async (data: any[]): Promise<void> => {
  try {
    await apiClient.post<void>(MENU_API_ROUTES.updateMenuGroupPositions, data);
  } catch (error) {
    throw handleApiError(error);
  }
};

const getAllMenuItemsForGroup = async (groupId: number | string): Promise<MenuItem[]> => {
  try {
    const res: AxiosResponse<MenuItem[]> = await apiClient.get<MenuItem[]>(MENU_API_ROUTES.getAllMenuItemsForGroup(groupId));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const getSingleMenuItem = async (id: number | string): Promise<MenuItem> => {
  try {
    const res: AxiosResponse<MenuItem> = await apiClient.get<MenuItem>(MENU_API_ROUTES.getSingleMenuItem(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const createMenuItem = async (groupId: number | string, data: CreateMenuItemInput): Promise<MenuItem> => {
  try {
    const res: AxiosResponse<MenuItem> = await apiClient.post<MenuItem>(MENU_API_ROUTES.createMenuItem(groupId), data);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateMenuItem = async (id: number | string, data: UpdateMenuItemInput): Promise<MenuItem> => {
  try {
    const res: AxiosResponse<MenuItem> = await apiClient.put<MenuItem>(MENU_API_ROUTES.updateMenuItem(id), data);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteMenuItem = async (id: number | string): Promise<void> => {
  try {
    await apiClient.delete<void>(MENU_API_ROUTES.deleteMenuItem(id));
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateMenuItemPositions = async (groupId: number | string, data: UpdatePositionsInput[]): Promise<void> => {
  try {
    await apiClient.put<void>(MENU_API_ROUTES.updateMenuItemPositions(groupId), data);
  } catch (error) {
    throw handleApiError(error);
  }
};

export {
  getAllMenuGroups,
  getSingleMenuGroup,
  createMenuGroup,
  updateMenuGroup,
  deleteMenuGroup,
  updateMenuGroupPositions,
  getAllMenuItemsForGroup,
  getSingleMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateMenuItemPositions,
};