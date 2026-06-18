"use client";

import React, { useMemo } from "react";
import { App, ConfigProvider, Menu, Segmented, Spin, theme } from "antd";
import type { MenuProps, ThemeConfig } from "antd";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSafeMenuTranslate } from "@/features/core/permissions/useSafeMenuTranslate";

import { useMenuStore } from "@/features/core/menu/menu";
import { setUserLastPath } from "@/utils/clientUtils";
import { getMenuConfig } from "./menuConfig";
import { navigateFromMenuClick } from "./menuNavigate";
import { useMenuData } from "./useMenuData";
import { useAuthStore } from "@/features/core/auth/store";

type MenuItem = Required<MenuProps>["items"][number];
const { useToken } = theme;

export default function TopMenu({ variant = "bar" }: { variant?: "bar" | "inline" }) {
  const { token } = useToken();
  const t = useTranslations("menu");
  const translateMenu = useSafeMenuTranslate();
  const router = useRouter();
  const pathname = usePathname();
  const { message } = App.useApp();
  const { authData } = useAuthStore();

  const { lastMenuClick, setLastMenuClick, lastMenuGroup, setLastMenuGroup, lastMenuMode, setLastMenuMode } = useMenuStore();
  const { menuGroups, menuGroupsLoading, isContainSingleMenu, permissionData } = useMenuData();

  const menuConfig = useMemo(() => {
    const isDeveloper = authData?.role?.roleName?.toLowerCase() === "developer";
    const mapping = isDeveloper ? ({ __bypass: true } as any) : permissionData;
    return getMenuConfig(translateMenu, mapping, menuGroups);
  }, [translateMenu, permissionData, menuGroups, authData?.role?.roleName]);
  const items: MenuItem[] = menuConfig.menuItems || [];
  const singleItems: MenuItem[] = menuConfig.singleMenuItems || [];

  const onClick: MenuProps["onClick"] = (e) => {
    try {
      navigateFromMenuClick({
        router,
        pathname,
        menuKey: e.key,
        keyPath: e.keyPath ?? [],
        setUserLastPath,
        setLastMenuGroup,
        setLastMenuClick,
      });
    } catch (err: any) {
      message.error(err?.message || "Navigation failed");
    }
  };

  const topMenuTheme: ThemeConfig = useMemo(
    () => ({
      components: {
        Menu: {
          itemBorderRadius: token.borderRadiusLG,
          subMenuItemBorderRadius: token.borderRadius,
          itemMarginInline: token.marginXXS,
          itemMarginBlock: 0,
          itemHeight: 44,
          iconSize: 16,
          collapsedIconSize: 16,
          itemBg: "transparent",
          // Stronger contrast for dark-mode popups
          popupBg: token.colorBgElevated,
          subMenuItemBg: token.colorBgElevated,
          itemHoverBg: token.colorFillSecondary,
          itemSelectedBg: token.colorPrimaryBg,
          itemSelectedColor: token.colorText,
          itemActiveBg: token.colorPrimaryBgHover,
          itemColor: token.colorText,
          itemHoverColor: token.colorText,
          groupTitleColor: token.colorTextSecondary,
          activeBarWidth: 0,
          activeBarHeight: 0,
          fontSize: token.fontSize,
          iconMarginInlineEnd: token.marginSM,
          horizontalItemBorderRadius: token.borderRadiusLG,
          horizontalItemSelectedBg: token.colorPrimaryBg,
          horizontalItemSelectedColor: token.colorText,
          horizontalItemHoverBg: token.colorFillSecondary,
        },
      },
    }),
    [token]
  );

  const currentItems = isContainSingleMenu && lastMenuMode === "menu" ? singleItems : items;

  const rootStyle =
    variant === "inline"
      ? { background: "transparent", borderBottom: "none" }
      : { background: token.colorBgContainer, borderBottom: `1px solid ${token.colorSplit}` };

  const containerPadding =
    variant === "inline"
      ? `${token.paddingXXS}px 0px`
      : `${token.paddingXS}px ${token.paddingLG}px`;

  return (
    <div style={rootStyle}>
      <ConfigProvider theme={topMenuTheme}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: token.marginSM,
            padding: containerPadding,
          }}
        >
          {isContainSingleMenu ? (
            <Segmented
              size="middle"
              options={[
                { label: "Menu", value: "menu" },
                { label: "Module", value: "module" },
              ]}
              value={lastMenuMode}
              onChange={(v) => setLastMenuMode(v as "menu" | "module")}
            />
          ) : null}

          <div style={{ flex: 1, minWidth: 0 }}>
            {menuGroupsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: token.paddingSM }}>
                <Spin size="small" />
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <Menu
                  mode="horizontal"
                  selectedKeys={[lastMenuClick]}
                  defaultOpenKeys={[lastMenuGroup]}
                  items={currentItems}
                  onClick={onClick}
                  style={{ borderBottom: "none", background: "transparent", minWidth: "max-content" }}
                />
              </div>
            )}
          </div>
        </div>
      </ConfigProvider>
    </div>
  );
}

