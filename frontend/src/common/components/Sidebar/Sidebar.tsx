"use client";

import React, { useMemo } from "react";
import { Layout, Menu, MenuProps, Typography, theme, App, Spin, Segmented, ConfigProvider, Tooltip } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSafeMenuTranslate } from "@/features/core/permissions/useSafeMenuTranslate";
import { useMenuStore } from "@/features/core/menu/menu";
import { clearClientCookies, setUserLastPath } from "@/utils/clientUtils";
import { getMenuConfig } from "./menuConfig";
import { navigateFromMenuClick } from "./menuNavigate";
import BButton from "../@bdata/AppButton";
import { useIsMobile, useIsTabletDown } from "@/common/hooks/useBreakpoint";
import { useAuthStore } from "@/features/core/auth/store";

import type { ThemeConfig } from "antd";
import { useAppSettings } from "@/common/provider/AppSettingsContentProvider";
import { useSocketStatus, SOCKET_STATUS } from "@/lib/socket/SocketProvider";
import CacheImage from "../@bdata/CacheImage";
import { useMenuData } from "./useMenuData";

type MenuItem = Required<MenuProps>["items"][number];

const { Sider } = Layout;
const { Text, Title } = Typography;
const { useToken } = theme;

const Sidebar: React.FC<{ collapsed: boolean; setCollapsed: (collapsed: boolean) => void }> = ({ collapsed, setCollapsed }) => {
  const { message } = App.useApp();
  const t = useTranslations("menu");
  const translateMenu = useSafeMenuTranslate();
  const isMobile = useIsMobile();
  const isTabletDown = useIsTabletDown();
  const router = useRouter();
  const pathname = usePathname();

  const {
    menus,
    lastMenuClick,
    setLastMenuClick,
    lastMenuGroup,
    setLastMenuGroup,
    lastMenuMode,
    setLastMenuMode,
    setMenus,
    menuCollapsedPreference,
    setMenuCollapsed,
  } = useMenuStore();
  const { status: socketStatus } = useSocketStatus();
  const { token } = useToken();
  const { authData } = useAuthStore();

  const { menuGroups, menuGroupsLoading, isContainSingleMenu, permissionData } = useMenuData();

  const menuConfig = useMemo(() => {
    const isDeveloper = authData?.role?.roleName?.toLowerCase() === "developer";
    const mapping = isDeveloper ? ({ __bypass: true } as any) : permissionData;
    return getMenuConfig(translateMenu, mapping, menuGroups);
  }, [translateMenu, permissionData, menuGroups, authData?.role?.roleName]);

  const items: MenuItem[] = menuConfig.menuItems || [];
  const singleItems: MenuItem[] = menuConfig.singleMenuItems || [];

  const handleMenuClick = (e: { key: string; keyPath: string[] }) => {
    navigateFromMenuClick({
      router,
      pathname,
      menuKey: e.key,
      keyPath: e.keyPath ?? [],
      setUserLastPath,
      setLastMenuGroup,
      setLastMenuClick,
    });
  };

  const onSignOut = async () => {
    // keep existing function signature, but sign-out is handled elsewhere now
    message.success("Sign out success");
  };

  const PROFILE_PATH = "/profile";

  // Profile is a personal shortcut — always available, regardless of role
  // (Developer, Admin or a regular user with no menu permissions).
  const handleProfileClick = () => {
    navigateFromMenuClick({
      router,
      pathname,
      menuKey: PROFILE_PATH,
      keyPath: [PROFILE_PATH],
      setUserLastPath,
      setLastMenuGroup,
      setLastMenuClick,
    });
  };

  const isProfileActive = lastMenuClick === PROFILE_PATH;

  const { appSettings } = useAppSettings();

  const sidebarMenuTheme: ThemeConfig = useMemo(
    () => ({
      components: {
        Menu: {
          itemBorderRadius: token.borderRadiusLG,
          subMenuItemBorderRadius: token.borderRadius,
          itemMarginInline: token.marginXS,
          itemMarginBlock: token.marginXXS,
          itemHeight: 40,
          iconSize: 16,
          collapsedIconSize: 16,
          itemBg: "transparent",
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
        },
      },
    }),
    [token]
  );

  const renderToggleButtons = useMemo(() => {
    if (collapsed || !isContainSingleMenu) return null;
    return (
      <div style={{ padding: `${token.paddingSM}px ${token.paddingSM}px ${token.paddingXS}px` }}>
        <Segmented
          block
          size="middle"
          options={[
            { label: "Menu", value: "menu" },
            { label: "Module", value: "module" },
          ]}
          value={lastMenuMode}
          onChange={(v) => setLastMenuMode(v as "menu" | "module")}
        />
      </div>
    );
  }, [collapsed, isContainSingleMenu, lastMenuMode, setLastMenuMode, token.paddingSM, token.paddingXS]);

  const renderModuleMenu = useMemo(
    () => (
      <Menu
        mode="inline"
        inlineIndent={20}
        selectedKeys={[lastMenuClick]}
        defaultOpenKeys={[lastMenuGroup]}
        items={items}
        onClick={handleMenuClick}
        style={{ borderInlineEnd: "none", background: "transparent" }}
      />
    ),
    [lastMenuClick, lastMenuGroup, items]
  );

  const renderSingleMenu = useMemo(
    () => (
      <Menu
        mode="inline"
        inlineIndent={20}
        selectedKeys={[lastMenuClick]}
        items={singleItems}
        onClick={handleMenuClick}
        style={{ borderInlineEnd: "none", background: "transparent" }}
      />
    ),
    [lastMenuClick, singleItems]
  );

  const renderMenu = () => (
    <ConfigProvider theme={sidebarMenuTheme}>
      {renderToggleButtons}
      {isContainSingleMenu && lastMenuMode === "menu" ? renderSingleMenu : renderModuleMenu}
    </ConfigProvider>
  );

  const showMobileOverlay = isTabletDown && !collapsed;

  return (
    <>
      {showMobileOverlay ? (
        <div
          className="fixed inset-0 z-[1000] bg-black/45"
          role="presentation"
          aria-hidden
          onClick={() => setCollapsed(true)}
        />
      ) : null}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={isMobile ? 280 : 250}
        className="relative min-h-screen flex flex-col"
        breakpoint="lg"
        onBreakpoint={(broken) => {
          if (broken) {
            setMenuCollapsed(true);
          } else {
            setMenuCollapsed(menuCollapsedPreference);
          }
        }}
        collapsedWidth={isTabletDown ? 0 : 80}
        style={{
          backgroundColor: token.colorBgContainer,
          borderInlineEnd: `1px solid ${token.colorSplit}`,
          boxShadow: token.boxShadowTertiary,
          ...(showMobileOverlay
            ? {
                position: "fixed",
                zIndex: 1001,
                left: 0,
                top: 0,
                height: "100vh",
              }
            : {}),
        }}
      >
      <div
        className="flex flex-col items-center overflow-hidden"
        style={{
          height: "var(--nav-brand-height)",
          backgroundColor: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorSplit}`,
        }}
      >
        {collapsed ? (
          <div className="flex items-center justify-center w-full" style={{ height: "calc(var(--nav-brand-height) / 2)" }}>
            <CacheImage
              imageUrl={appSettings?.app_icon}
              className="w-12"
              width={48}
              height={48}
            />
          </div>
        ) : (
          <div className="flex items-center py-5 justify-center w-full" style={{ height: "calc(var(--nav-brand-height) / 2)" }}>
            {appSettings?.show_menu_logo && (
              <CacheImage
                imageUrl={appSettings?.app_icon}
                className="w-8 mr-2"
                width={32}
                height={32}
              />
            )}
            {appSettings?.show_menu_text && (
              <Title level={4} className="text-xl font-bold" style={{ marginBottom: 0, color: token.colorText }}>
                {appSettings?.app_short_code ?? "APP"}
              </Title>
            )}
          </div>
        )}
        {collapsed ? (
          <div className="flex items-center justify-center w-full" style={{ height: "calc(var(--nav-brand-height) / 2)" }}>
            <CacheImage
              imageUrl={authData?.profileImage}
              className="w-8 h-8 rounded-full"
              width={32}
              height={32}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between w-full px-3 py-2 pb-6" style={{ height: "calc(var(--nav-brand-height) / 2)" }}>
            <div className="flex items-center">
              <CacheImage
                imageUrl={authData?.profileImage}
                className="w-8 h-8 rounded-full"
                width={32}
                height={32}
              />
              <div className="ml-2">
                <Title level={5} className="font-bold truncate w-[140px]" style={{ marginBottom: 0, color: token.colorText }}>
                  {authData?.fullName}
                </Title>
                <Text className="text-sm" style={{ color: token.colorTextSecondary }}>
                  {authData?.role?.roleName}
                </Text>
              </div>
            </div>
            <Tooltip title="Go to Profile" placement="left">
              <BButton
                buttonKey="profile"
                variant={isProfileActive ? "solid" : "text"}
                color="default"
                onClick={handleProfileClick}
              >
                <UserOutlined />
              </BButton>
            </Tooltip>
          </div>
        )}
      </div>
      <div
        className="bdata-sidebar-scroll"
        style={{ height: "var(--nav-content-height)", overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {menuGroupsLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spin />
          </div>
        ) : (
          renderMenu()
        )}
      </div>
      <div
        className="overflow-hidden flex items-center justify-center"
        style={{
          height: "var(--nav-footer-height)",
          backgroundColor: socketStatus === SOCKET_STATUS.CONNECTED ? token.colorSuccessBg : token.colorWarningBg,
          borderTop: `1px solid ${token.colorSplit}`,
        }}
      />
      </Sider>
    </>
  );
};

export default Sidebar;