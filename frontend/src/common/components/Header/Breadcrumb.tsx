"use client";

import React, { ReactNode, useState } from "react";
import { Layout, Breadcrumb } from "antd";
import { useSafeMenuTranslate } from "@/features/core/permissions/useSafeMenuTranslate";
import { convertPathToName } from "@/utils/utils";
import { HomeOutlined } from "@ant-design/icons";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMenuManagementStore } from "@/features/core/menuManagement/store";
import TheIcon, { Name } from "../@bdata/IconPicker/icons";
import { useAppSettings } from "@/common/provider/AppSettingsContentProvider";
import { CONSOLE_HOME_PATH } from "@/lib/auth/console-paths";

export default function Index() {
  const menuTranslate = useSafeMenuTranslate();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { menuGroups } = useMenuManagementStore();
  const { appSettings } = useAppSettings();

  const menuList = menuGroups.flatMap((group) => group.items);
  const currentMenu = menuList.find((item) => item.key === pathname) || null;
  const menuGroup = menuGroups.find((group) => group.id === currentMenu?.groupId) || null;

  const headerTitle = (currentMenu?.title ? menuTranslate(currentMenu.title) : currentMenu?.key) || convertPathToName(pathname);

  const breadcrumbData = {
    path: pathname,
    name: convertPathToName(headerTitle),
  };
  return (
    <>
      {/* Content Header */}
      <div className="flex justify-between items-center gap-4 content-title">
        <Breadcrumb
          items={[
            {
              href: CONSOLE_HOME_PATH,
              title: currentMenu?.icon ? <TheIcon name={currentMenu?.icon as Name} style={{ margin: 0, padding: 0 }} /> : <HomeOutlined />,
            },
            {
              key: `0${menuGroup?.id || appSettings?.app_name}`,
              title: <span>{menuGroup?.title ? menuTranslate(menuGroup?.title) : appSettings?.app_name}</span>, // Added text-white
            },
            {
              key: `1${breadcrumbData.name}`,
              title: (
                <a href={breadcrumbData.path}>
                  <span>{breadcrumbData.name.replace(/\//g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}</span>
                </a>
              ),
            },
            // {
            //   key: `2${searchParams?.toString()}`,
            //   title: <span>{searchParams?.toString()}</span>, // Added text-white
            // },
          ]}
        />
      </div>
    </>
  );
}
