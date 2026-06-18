"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Spin, Tabs, theme } from "antd";
import {
  AppstoreOutlined,
  IdcardOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CommonHeader from "@/common/components/@bdata/CommonHeader";
import Details from "./Details";
import ProfileHero from "./ProfileHero";
import { useProfileActions } from "./useProfileActions";

const VALID_TABS = ["overview", "account", "security", "access"] as const;
type TabKey = (typeof VALID_TABS)[number];
const DEFAULT_TAB: TabKey = "overview";

const isValidTab = (value: string | null | undefined): value is TabKey =>
  !!value && (VALID_TABS as readonly string[]).includes(value);

function ProfileContent() {
  const { token } = theme.useToken();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const actions = useProfileActions();

  const tabFromUrl = searchParams.get("tab");
  // Avoid auto-redirecting the URL on first mount: it can cancel in-flight server
  // actions on Next.js 16 + Turbopack and leaves tabs stuck in a loading state.
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    isValidTab(tabFromUrl) ? tabFromUrl : DEFAULT_TAB
  );

  // Only react to subsequent URL changes (browser back/forward, deep links).
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

  const tabItems = useMemo(
    () => [
      {
        key: "overview",
        label: (
          <span className="inline-flex items-center gap-2">
            <AppstoreOutlined />
            Overview
          </span>
        ),
      },
      {
        key: "account",
        label: (
          <span className="inline-flex items-center gap-2">
            <IdcardOutlined />
            Account
          </span>
        ),
      },
      {
        key: "security",
        label: (
          <span className="inline-flex items-center gap-2">
            <SafetyCertificateOutlined />
            Security
          </span>
        ),
      },
      {
        key: "access",
        label: (
          <span className="inline-flex items-center gap-2">
            <KeyOutlined />
            Access
          </span>
        ),
      },
    ],
    []
  );

  return (
    <>
      <CommonHeader title="Profile" icon={UserOutlined as any} />
      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <ProfileHero
            profile={actions.profile}
            uploading={actions.uploadingAvatar}
            onAvatarSelected={actions.updateAvatar}
          />

          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
            tabBarStyle={{
              margin: 0,
              padding: "0 16px",
              background: token.colorBgContainer,
              borderRadius: token.borderRadiusLG,
              boxShadow: token.boxShadowTertiary,
            }}
          />

          <Details activeKey={activeTab} actions={actions} />
        </div>
      </div>
    </>
  );
}

const ProfilePage: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spin />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
};

export default ProfilePage;
