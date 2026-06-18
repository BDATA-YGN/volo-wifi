"use client";
import React, { useEffect } from "react";
import { Layout, Button, Space } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, SunOutlined, MoonOutlined, AppstoreOutlined } from "@ant-design/icons";
import { App, theme } from "antd";

import * as AuthHook from "@/features/core/auth/useAuth";
import LocaleSwitcher from "../LocalSwitcher/LocaleSwitcher";
import { useTranslations } from "next-intl";
import { useIsMobile } from "@/common/hooks/useBreakpoint";
import { useAuthStore } from "@/features/core/auth/store";
import NotificationSystem from "./NotificationSystem";
import ConversationBell from "./ConversationBell";
import BreadCrumb from "./Breadcrumb";
import { SessionIndicator } from "../Sidebar/SessionIndicator";
import TopMenu from "../Sidebar/TopMenu";

const { Header: AntdHeader } = Layout;
const { useToken } = theme;

const Header: React.FC<{
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleTheme: () => void;
  systemTheme: string;
  menuLayout: "sidebar" | "top";
  toggleMenuLayout: () => void;
}> = ({ collapsed, setCollapsed, toggleTheme, systemTheme, menuLayout, toggleMenuLayout }) => {
  const { message, notification, modal } = App.useApp();

  const isMobile = useIsMobile();

  const { signOut, loading, error, reAuthenticate } = AuthHook.useLoginUser();

  const onSignOut = async () => {
    await signOut()
      .then(() => {
        message.success("Sign out success");
      });
  };

  const handleSignOut = () => {
    modal.confirm({
      title: "Are you sure?",
      content: "Session will clear for your account",
      okText: "Sure",
      cancelText: "Cancel",
      onOk: onSignOut,
    });
  };

  return (
    <AntdHeader
      className="header"
      style={{ padding: "0 16px", height: "var(--header-height)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
    >
      <div className="flex items-center gap-2 sm:gap-4 align-middle min-w-0" style={{ flex: 1 }}>
        {menuLayout === "sidebar" ? (
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: "16px", width: 40, height: 40, flexShrink: 0 }}
            aria-label={collapsed ? "Open menu" : "Close menu"}
          />
        ) : (
          <Button type="text" icon={<AppstoreOutlined />} onClick={toggleMenuLayout} style={{ fontSize: "16px", width: 40, height: 40, flexShrink: 0 }} />
        )}
        <div className="min-w-0 flex-1 overflow-hidden">
          {menuLayout === "sidebar" ? (
            isMobile ? null : <BreadCrumb />
          ) : (
            <TopMenu variant="inline" />
          )}
        </div>
      </div>
      <Space size={isMobile ? "small" : "middle"} wrap className="header-actions shrink-0">
        {menuLayout === "sidebar" && !isMobile ? (
          <Button type="text" icon={<AppstoreOutlined />} onClick={toggleMenuLayout} />
        ) : null}
        <ConversationBell />
        <NotificationSystem />
        <Button type="text" onClick={toggleTheme} aria-label="Toggle theme">
          {systemTheme === "light" ? <SunOutlined /> : <MoonOutlined />}
        </Button>
        <LocaleSwitcher />
        {isMobile ? (
          <Button variant="outlined" onClick={handleSignOut} icon={<LogoutOutlined />} loading={loading} aria-label="Sign out" />
        ) : (
          <SessionIndicator />
        )}
      </Space>
    </AntdHeader>
  );
};

export default Header;
