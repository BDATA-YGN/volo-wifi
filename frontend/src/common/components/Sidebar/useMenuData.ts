"use client";

import { useEffect, useRef, useState } from "react";
import { useRequest } from "ahooks";
import { App } from "antd";

import { useLoginUser } from "@/features/core/auth/useAuth";
import { usePermissionStore } from "@/features/core/permissions/store";
import { useMenuStore } from "@/features/core/menu/menu";
import { useMenu } from "@/features/core/menuManagement/useMenu";
import { useMenuManagementStore } from "@/features/core/menuManagement/store";
import type { MenuGroup } from "@/features/core/menuManagement/types";

export function useMenuData() {
  const { message } = App.useApp();
  const isInitialLoadRef = useRef(true);

  const { fetchMe, signOut } = useLoginUser();
  const { setPermissionData, permissionData } = usePermissionStore();
  const { setMenus, menus } = useMenuStore();
  const { fetchAllMenuGroups } = useMenu();
  const { menuGroups: storedMenuGroups } = useMenuManagementStore();

  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [isContainSingleMenu, setIsContainSingleMenu] = useState<boolean>(false);

  const { loading: menuGroupsLoading, runAsync: fetchMenuGroups } = useRequest(
    async () => fetchAllMenuGroups(),
    {
      manual: true,
      onSuccess: (data) => {
        const groups = data ?? [];
        setMenuGroups(groups);
        setIsContainSingleMenu(Boolean(groups.find((g) => g.mode === 1)));
      },
      onError: () => {
        // keep non-blocking; we just show empty menus
        console.log("Failed to fetch menu groups");
      },
    }
  );

  useEffect(() => {
    // Keep local view in sync with global store (Breadcrumb/CommonHeader).
    // This prevents breadcrumb being empty if it renders before Sidebar/TopMenu.
    if (storedMenuGroups?.length) {
      setMenuGroups(storedMenuGroups);
      setIsContainSingleMenu(Boolean(storedMenuGroups.find((g) => g.mode === 1)));
    }
  }, [storedMenuGroups]);

  useEffect(() => {
    const initialLoad = async () => {
      try {
        const userData = await fetchMe();
        if (userData?.menus) setMenus(userData.menus);
        await fetchMenuGroups();
      } catch (error) {
        console.error("ERROR on menu initial load:", error);
        await signOut().finally(() => {
          message.error("Session expired. Please sign in again.");
        });
      }
    };

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      initialLoad();
    }
  }, [fetchMe, fetchMenuGroups, message, setMenus, signOut, storedMenuGroups?.length]);

  useEffect(() => {
    if (menus && Object.keys(menus).length > 0) {
      setPermissionData(menus);
      return;
    }
    setPermissionData(null);
  }, [menus, setPermissionData]);

  return {
    menuGroups,
    menuGroupsLoading,
    isContainSingleMenu,
    permissionData,
  };
}

