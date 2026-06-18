"use client";

import React from "react";
import { theme } from "antd";
import { Database, LucideIcon } from "lucide-react";
import { useMenuManagementStore } from "@/features/core/menuManagement/store";
import { usePathname } from "next/navigation";
import { useSafeMenuTranslate } from "@/features/core/permissions/useSafeMenuTranslate";
import TheIcon, { Name } from "../IconPicker/icons";

// Define props interface with default values and optional types
interface CommonHeaderProps {
  title?: string;
  extras?: React.ReactNode;
  icon?: LucideIcon | null; // Allow null for no icon
}

const CommonHeader: React.FC<CommonHeaderProps> = ({
  title,
  extras,
  icon: Icon = Database, // Default to Database if no icon provided
}) => {
  const { token } = theme.useToken();
  const { menuGroups } = useMenuManagementStore();
  const pathname = usePathname();
  const translateMenu = useSafeMenuTranslate();

  // Flatten menu items and find the current
  const menuList = menuGroups.flatMap((group) => group.items);
  const currentMenu = menuList.find((item) => item.key === pathname) || null;

  const headerTitle =
    title || (currentMenu?.title ? translateMenu(currentMenu.title) : currentMenu?.key) || "";

  // Determine the icon to render
  const headerIcon = currentMenu?.icon ? (
    <TheIcon name={currentMenu.icon as Name} className="text-blue-600 h-6 w-6" />
  ) : Icon ? (
    <Icon className="text-blue-600 mr-2" size={24} />
  ) : null;

  return (
    <div
      className="border-b flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center shadow-sm sticky top-0 px-4 sm:px-6"
      style={{
        minHeight: "var(--content-header-height)",
        backgroundColor: token.colorBgContainer,
        zIndex: 100,
      }}
    >
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        {headerIcon ? <div className="shrink-0">{headerIcon}</div> : null}
        <h1 className="text-base sm:text-lg font-semibold m-0 truncate">{headerTitle}</h1>
      </div>
      {extras ? (
        <div className="flex items-center gap-2 overflow-x-auto max-w-full sm:max-w-[55%] sm:justify-end pb-0.5 sm:pb-0">
          {extras}
        </div>
      ) : null}
    </div>
  );
};

export default CommonHeader;