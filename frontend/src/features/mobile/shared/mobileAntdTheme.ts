import { theme as antdTheme, type ThemeConfig } from "antd";
import type { MobileActorType } from "./types";
import type { MobileColorScheme } from "./mobileThemeStore";

export function getMobileAntdTheme(
  scheme: MobileColorScheme,
  actor: MobileActorType = "collector",
): ThemeConfig {
  const isDark = scheme === "dark";
  const isCustomer = actor === "customer";
  const isPartner = actor === "partner";
  const colorPrimary = isPartner
    ? isDark
      ? "#a78bfa"
      : "#7c3aed"
    : isCustomer
      ? isDark
        ? "#60a5fa"
        : "#2563eb"
      : isDark
        ? "#2dd4bf"
        : "#0f766e";

  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary,
      colorBgContainer: isDark ? "#1e293b" : "#ffffff",
      colorBgElevated: isDark ? "#1e293b" : "#ffffff",
      colorBgLayout: isDark ? "#0f172a" : "#f8fafc",
      colorText: isDark ? "#f1f5f9" : "#0f172a",
      colorTextSecondary: isDark ? "#94a3b8" : "#64748b",
      colorBorder: isDark ? "#334155" : "#e2e8f0",
      colorSplit: isDark ? "#334155" : "#f1f5f9",
      controlHeight: 44,
      controlHeightLG: 48,
      fontSize: 15,
    },
    components: {
      Button: {
        controlHeight: 44,
        controlHeightLG: 48,
        paddingContentHorizontal: 16,
      },
      Input: {
        controlHeight: 44,
        controlHeightLG: 48,
      },
      Select: {
        controlHeight: 44,
      },
      Drawer: {
        paddingLG: 16,
      },
    },
  };
}
