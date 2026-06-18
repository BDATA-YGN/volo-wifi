import type { Metadata, Viewport } from "next";
import { BRAND_METADATA_ICONS } from "@/common/brand";

export const metadata: Metadata = {
  title: {
    default: "Volo WiFi",
    template: "%s · Volo WiFi",
  },
  description: "Connect to Volo WiFi — enter your voucher or account to get online.",
  applicationName: "Volo WiFi",
  formatDetection: {
    telephone: false,
  },
  icons: BRAND_METADATA_ICONS,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f766e",
};

export default function CaptivePortalGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
