"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, theme, Spin } from "antd";
import {
  KeyOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import ManageRoleSettings from "@/features/core/permissions/components/ManageRoleSettings";
import ManageRoles from "@/features/core/permissions/components/ManageRoles";
import MapRoleSettings from "@/features/core/permissions/components/MapRoleSettings";

const VALID_TABS = ["permissions", "roles", "map"] as const;
type TabKey = (typeof VALID_TABS)[number];
const DEFAULT_TAB: TabKey = "permissions";

const isValidTab = (value: string | null | undefined): value is TabKey =>
  !!value && (VALID_TABS as readonly string[]).includes(value);

function PermissionsTabs() {
  const { token } = theme.useToken();
  const t = useTranslations("permissions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  // Initialize directly from URL; never run `router.replace` during first mount
  // because that cancels server actions (fetchMngRoleSettings) on Next.js 16 + Turbopack
  // and leaves the table stuck in a loading state on first visit.
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    isValidTab(tabFromUrl) ? tabFromUrl : DEFAULT_TAB
  );

  // Only sync URL → state on subsequent URL changes (back/forward, deep links).
  useEffect(() => {
    if (isValidTab(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  const handleTabChange = useCallback(
    (key: string) => {
      if (!isValidTab(key)) return;
      setActiveTab(key);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const tabPanelStyle: React.CSSProperties = {
    padding: "20px 24px",
  };

  const tabItems = useMemo(
    () => [
      {
        key: "permissions",
        label: (
          <span className="inline-flex items-center gap-2">
            <KeyOutlined />
            {t("managePermissions")}
          </span>
        ),
        children: (
          <div style={tabPanelStyle}>
            <ManageRoleSettings activeKey={activeTab} />
          </div>
        ),
      },
      {
        key: "roles",
        label: (
          <span className="inline-flex items-center gap-2">
            <TeamOutlined />
            {t("manageRoles")}
          </span>
        ),
        children: (
          <div style={tabPanelStyle}>
            <ManageRoles activeKey={activeTab} />
          </div>
        ),
      },
      {
        key: "map",
        label: (
          <span className="inline-flex items-center gap-2">
            <SafetyCertificateOutlined />
            {t("mapRolePermissions")}
          </span>
        ),
        children: (
          <div style={tabPanelStyle}>
            <MapRoleSettings activeKey={activeTab} />
          </div>
        ),
      },
    ],
    [activeTab, t]
  );

  return (
    <div className="p-0">
      <CommonHeader />
      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="middle"
          tabBarStyle={{
            background: token.colorBgContainer,
            paddingInline: 24,
            marginBottom: 0,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
          tabBarGutter={28}
          style={{ background: "transparent" }}
        />
      </div>
    </div>
  );
}

export default function PermissionsPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center"
          style={{ height: "var(--content-body-height)" }}
        >
          <Spin />
        </div>
      }
    >
      <PermissionsTabs />
    </Suspense>
  );
}
