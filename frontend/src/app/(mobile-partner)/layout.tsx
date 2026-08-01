import type { Metadata, Viewport } from "next";
import { BRAND_METADATA_ICONS } from "@/common/brand";
import { MOBILE_PWA_CONFIG } from "@/features/mobile/shared/pwa/config";

const pwa = MOBILE_PWA_CONFIG.partner;

export const metadata: Metadata = {
  title: {
    default: pwa.appleWebAppTitle,
    template: `%s · ${pwa.appleWebAppTitle}`,
  },
  description: pwa.installDescription,
  manifest: pwa.manifestPath,
  applicationName: pwa.appleWebAppTitle,
  appleWebApp: {
    capable: true,
    title: pwa.appleWebAppTitle,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    ...BRAND_METADATA_ICONS,
    apple: [{ url: "/partner/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    other: [
      { rel: "apple-touch-icon", url: "/partner/icons/icon-192.png" },
      { rel: "icon", url: "/partner/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { rel: "icon", url: "/partner/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: pwa.themeColor },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function MobilePartnerGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
