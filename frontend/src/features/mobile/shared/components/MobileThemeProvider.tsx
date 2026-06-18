"use client";

import { useMemo } from "react";
import { ConfigProvider } from "antd";
import { getMobileAntdTheme } from "../mobileAntdTheme";
import { useMobileThemeStore } from "../mobileThemeStore";
import type { MobileActorType } from "../types";

interface MobileThemeProviderProps {
  children: React.ReactNode;
  actor?: MobileActorType;
}

export default function MobileThemeProvider({
  children,
  actor = "collector",
}: MobileThemeProviderProps) {
  const scheme = useMobileThemeStore((s) => s.theme);
  const antdTheme = useMemo(() => getMobileAntdTheme(scheme, actor), [scheme, actor]);

  return <ConfigProvider theme={antdTheme}>{children}</ConfigProvider>;
}
