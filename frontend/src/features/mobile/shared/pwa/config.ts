import type { MobileActorType } from "../types";

export interface MobilePwaConfig {
  manifestPath: string;
  serviceWorkerPath: string;
  scope: string;
  startUrl: string;
  themeColor: string;
  backgroundColor: string;
  appleWebAppTitle: string;
  installTitle: string;
  installDescription: string;
}

export const MOBILE_PWA_CONFIG: Record<MobileActorType, MobilePwaConfig> = {
  collector: {
    manifestPath: "/collector/manifest.webmanifest",
    serviceWorkerPath: "/collector/sw.js",
    scope: "/collector/",
    startUrl: "/collector",
    themeColor: "#0f766e",
    backgroundColor: "#f8fafc",
    appleWebAppTitle: "VOLO Collector",
    installTitle: "Install VOLO Collector",
    installDescription: "Add to your home screen for faster access, camera QR scan, and offline shell.",
  },
  customer: {
    manifestPath: "/customer/manifest.webmanifest",
    serviceWorkerPath: "/customer/sw.js",
    scope: "/customer/",
    startUrl: "/customer",
    themeColor: "#2563eb",
    backgroundColor: "#f8fafc",
    appleWebAppTitle: "StarLink Customer",
    installTitle: "Install StarLink Customer",
    installDescription: "Add to your home screen to save certificates and open the portal like an app.",
  },
  partner: {
    manifestPath: "/partner/manifest.webmanifest",
    serviceWorkerPath: "/partner/sw.js",
    scope: "/partner/",
    startUrl: "/partner",
    themeColor: "#7c3aed",
    backgroundColor: "#f8fafc",
    appleWebAppTitle: "Volo Partner",
    installTitle: "Install Volo Partner",
    installDescription: "Sell WiFi tokens, track orders and payments from your home screen.",
  },
};

export function pwaDismissStorageKey(actor: MobileActorType): string {
  return `volo-pwa-install-dismissed:${actor}`;
}
