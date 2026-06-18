import type { MobileColorScheme } from "./mobileThemeStore";

export function getMobileDrawerChrome(scheme: MobileColorScheme) {
  const isDark = scheme === "dark";
  return {
    surface: isDark ? "#1e293b" : "#ffffff",
    border: isDark ? "#334155" : "#e2e8f0",
    text: isDark ? "#f1f5f9" : "#0f172a",
  };
}

export function getMobileDrawerStyles(scheme: MobileColorScheme) {
  const chrome = getMobileDrawerChrome(scheme);
  return {
    header: {
      background: chrome.surface,
      borderBottom: `1px solid ${chrome.border}`,
      color: chrome.text,
      padding: "0.875rem 1rem",
    },
    body: {
      padding: 0,
      background: chrome.surface,
      color: chrome.text,
    },
    footer: {
      padding: 0,
      margin: 0,
      borderTop: "none",
      background: chrome.surface,
    },
  };
}
