"use client";

import * as MenuUseCase from "./query";
import { useMenuManagementStore } from "./store";
import { getQueryClient } from "@/common/provider/get-query-client";
import { queryKey as appQueryKey } from "@/lib/cacheKeys";
import { useAsyncHandler } from "@/utils/utils";
import { MenuGroup, MenuItem, CreateMenuItemInput, UpdateMenuItemInput, UpdatePositionsInput } from "./types";
import { MenuGroupFormData } from "./types";

export const useMenu = () => {
  const { menuGroups, setMenuGroups, addMenuGroup, updateMenuGroup, removeMenuGroup, addMenuItem, updateMenuItem, removeMenuItem } = useMenuManagementStore();
  const queryClient = getQueryClient();
  const { loading, error, handleAsync, setError } = useAsyncHandler();

  const fetchAllMenuGroups = (): Promise<MenuGroup[]> => {
    return handleAsync(async () => {
      const data: MenuGroup[] = await MenuUseCase.getAllMenuGroups();
      // Replace list to avoid duplicates on refetch.
      setMenuGroups(data);
      return data;
    });
  };

  const fetchSingleMenuGroup = (id: number | string): Promise<MenuGroup> => {
    return handleAsync(async () => {
      const data: MenuGroup = await MenuUseCase.getSingleMenuGroup(id);
      updateMenuGroup(data.id, data);
      return data;
    });
  };

  const createMenuGroup = async (payload: MenuGroupFormData): Promise<any> => {
    return await handleAsync(() => MenuUseCase.createMenuGroup(payload));
  };

  const updateMenuGroupData = async (id: number | string, payload: MenuGroupFormData): Promise<MenuGroup> => {
    return await handleAsync(() => MenuUseCase.updateMenuGroup(id, payload));
  };

  const deleteMenuGroup = async (id: number | string): Promise<void> => {
    return await handleAsync(() => MenuUseCase.deleteMenuGroup(id));
  };

  const updateMenuGroupPositions = async (payload: any[]): Promise<void> => {
    return await handleAsync(() => MenuUseCase.updateMenuGroupPositions(payload));
  };

  const fetchAllMenuItemsForGroup = (groupId: number | string): Promise<MenuItem[]> => {
    return queryClient.fetchQuery({
      queryKey: appQueryKey(["MENU_ITEMS", groupId]),
      queryFn: () =>
        handleAsync(async () => {
          const data: MenuItem[] = await MenuUseCase.getAllMenuItemsForGroup(groupId);
          data.forEach((item) => {
            addMenuItem(Number(groupId), {
              id: item.id,
              groupId: item.groupId,
              key: item.key,
              title: item.title,
              icon: item.icon,
              url: item.url,
              position: item.position,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            });
          });
          return data;
        }),
      retry: false,
    });
  };

  const fetchSingleMenuItem = (id: number | string): Promise<MenuItem> => {
    return queryClient.fetchQuery({
      queryKey: appQueryKey(["MENU_ITEM", id]),
      queryFn: () =>
        handleAsync(async () => {
          const data: MenuItem = await MenuUseCase.getSingleMenuItem(id);
          updateMenuItem(data.groupId, data.id, data);
          return data;
        }),
      retry: false,
    });
  };

  const createMenuItem = async (groupId: number | string, payload: CreateMenuItemInput): Promise<MenuItem> => {
    return await handleAsync(() => MenuUseCase.createMenuItem(groupId, payload));
  };

  const updateMenuItemData = async (id: number | string, payload: UpdateMenuItemInput): Promise<MenuItem> => {
    return await handleAsync(() => MenuUseCase.updateMenuItem(id, payload));
  };

  const deleteMenuItem = async (id: number | string): Promise<void> => {
    return await handleAsync(() => MenuUseCase.deleteMenuItem(id));
  };

  const updateMenuItemPositions = async (groupId: number | string, payload: UpdatePositionsInput[]): Promise<void> => {
    return await handleAsync(() => MenuUseCase.updateMenuItemPositions(groupId, payload));
  };

  return {
    menuGroups,
    fetchAllMenuGroups,
    fetchSingleMenuGroup,
    createMenuGroup,
    updateMenuGroupData,
    deleteMenuGroup,
    updateMenuStructure: updateMenuGroupPositions,
    fetchAllMenuItemsForGroup,
    fetchSingleMenuItem,
    createMenuItem,
    updateMenuItemData,
    deleteMenuItem,
    updateMenuItemPositions,
    loading,
    error,
    setError,
  };
};
