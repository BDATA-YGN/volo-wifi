"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { Tabs, Typography, theme } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AppstoreOutlined,
  SafetyCertificateOutlined,
  CustomerServiceOutlined,
  ToolOutlined,
  TeamOutlined,
  CodeOutlined,
  CloudServerOutlined,
} from "@ant-design/icons";

import { useAuthStore } from "@/features/core/auth/store";

import AppSettingsTable from "./components/AppSettingsTable";
import {
  APP_SETTING_CATEGORIES,
  type AppSettingCategory,
} from "./interface";

const { Title } = Typography;

const DEVELOPER_ROLE_NAME = "developer";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  app:       <AppstoreOutlined />,
  sms:       <CloudServerOutlined />,
  legal:     <SafetyCertificateOutlined />,
  support:   <CustomerServiceOutlined />,
  ops:       <ToolOutlined />,
  hr:        <TeamOutlined />,
  developer: <CodeOutlined />,
};

const CATEGORY_TITLE: Record<string, string> = {
  app:       "App / UI Settings",
  sms:       "VOLO Subscription (SMS)",
  legal:     "Legal & Content",
  support:   "Support & Contacts",
  ops:       "Operations",
  developer: "Developer / Security",
};

const AppSettingsPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token } = theme.useToken();
  const { authData } = useAuthStore();

  const isDeveloperRole = useMemo(() => {
    const name = authData?.role?.roleName?.trim().toLowerCase() ?? "";
    return name === DEVELOPER_ROLE_NAME;
  }, [authData?.role?.roleName]);

  const visibleCategories = useMemo(
    () =>
      APP_SETTING_CATEGORIES.filter(
        (c) => c.key !== "developer" || isDeveloperRole,
      ),
    [isDeveloperRole],
  );

  const validTabs = useMemo(
    () => visibleCategories.map((c) => c.key),
    [visibleCategories],
  );

  const defaultTab = (visibleCategories[0]?.key ?? "app") as AppSettingCategory;

  const tabParam = searchParams.get("tab") ?? "";
  const activeTab = (validTabs.includes(tabParam as AppSettingCategory)
    ? tabParam
    : defaultTab) as AppSettingCategory;

  // Strip `?tab=developer` from the URL if the signed-in admin is not the
  // developer role (deep links / bookmarks).
  useEffect(() => {
    if (tabParam !== "developer" || isDeveloperRole) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [tabParam, isDeveloperRole, pathname, router, searchParams]);

  const handleTabChange = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", key);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const tabItems = visibleCategories.map((cat) => ({
    key: cat.key,
    label: (
      <span className="flex items-center gap-1.5">
        {CATEGORY_ICONS[cat.key]}
        {cat.labelEn}
      </span>
    ),
    children: (
      <div className="px-2 pt-1 pb-8">
        <Title level={4} style={{ marginBottom: 20, fontWeight: 600, color: token.colorTextHeading }}>
          {CATEGORY_TITLE[cat.key]}
        </Title>
        <AppSettingsTable
          category={cat.key as AppSettingCategory}
          activeTab={activeTab}
        />
      </div>
    ),
  }));

  return (
    <div
      className="rounded-lg shadow-sm px-8 pt-4 pb-6 [&_.ant-tabs-content-holder]:[min-height:min-content]"
      style={{
        minHeight: "var(--content-body-height)",
        flexShrink: 0,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        type="line"
        size="middle"
      />
    </div>
  );
};

export default AppSettingsPage;
