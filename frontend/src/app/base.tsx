"use client";

import React, { useState, useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import { ConfigProvider, Layout, App, theme as antdTheme } from "antd";
import { lightTheme, darkTheme } from "./themeConfig";
import { useThemeStore } from "@/common/store/themeStore";
import { Loading } from "@/common/components/Base/Loading";
import PathAwareErrorBoundary from "@/common/components/Base/PathAwareErrorBoundary";
import { useRequest } from "ahooks";
import { useTheme } from "@/features/core/themeBuilder/useThemes";
import { NotificationProvider } from "@/common/provider/NotificationProvider";
import { shouldRunAdminConsoleClient } from "@/lib/auth/cookies";
import { isCaptivePortalPath } from "@/features/captive-portal/subdomain";
import { getOverlayPopupContainer } from "@/common/utils/overlayContainer";

interface BaseComponentProps {
  children: React.ReactNode;
}

const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { message } = App.useApp();
  const pathname = usePathname();
  const loadAdminThemes = shouldRunAdminConsoleClient(pathname);
  const isCaptiveShell = isCaptivePortalPath(pathname);
  const { theme } = useThemeStore();
  const { fetchThemes } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<any>({
    dark: { algorithm: [antdTheme.darkAlgorithm, antdTheme.compactAlgorithm] },
    light: { algorithm: [antdTheme.defaultAlgorithm, antdTheme.compactAlgorithm] },
  });

  const { loading, run: fetchAllThemes } = useRequest(
    async () => fetchThemes(),
    {
      manual: true,
      onSuccess: (data: any) => {
        const result = data?.data?.find((t: any) => t.isActive === true);
        if (result) {
          setCurrentTheme({
            dark: { ...darkTheme, ...result.darkTheme },
            light: { ...lightTheme, ...result.lightTheme },
          });
        }
      },
      onError: (error: any) => {
        if (loadAdminThemes) {
          message.error(error?.message || "Failed to load themes");
        }
      },
    }
  );

  useEffect(() => {
    if (!loadAdminThemes) return;
    fetchAllThemes();
  }, [loadAdminThemes, fetchAllThemes]);

  const selectedTheme = theme === "dark" ? currentTheme.dark : currentTheme.light;
  const showThemeLoading = loadAdminThemes && loading;

  return (
    <ConfigProvider theme={selectedTheme} getPopupContainer={getOverlayPopupContainer}>
      <NotificationProvider>
        {isCaptiveShell ? (
          <PathAwareErrorBoundary>
            <Suspense fallback={<Loading />}>
              {showThemeLoading ? <Loading /> : children}
            </Suspense>
          </PathAwareErrorBoundary>
        ) : (
          <Layout style={{ minHeight: "100vh" }}>
            <PathAwareErrorBoundary>
              <Suspense fallback={<Loading />}>
                {showThemeLoading ? <Loading /> : children}
              </Suspense>
            </PathAwareErrorBoundary>
          </Layout>
        )}
      </NotificationProvider>
    </ConfigProvider>
  );
};

const BaseComponent: React.FC<BaseComponentProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Loading />;
  }

  return (
    <App>
      <ThemeWrapper>{children}</ThemeWrapper>
    </App>
  );
};

BaseComponent.displayName = "BaseComponent";
export default BaseComponent;