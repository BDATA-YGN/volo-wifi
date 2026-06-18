import type { Metadata } from "next";
import CaptiveRouterLoginPage from "@/features/captive-portal/components/CaptiveRouterLoginPage";

export const metadata: Metadata = {
  title: "Connecting",
};

export default function PortalRouterLoginPage() {
  return <CaptiveRouterLoginPage />;
}
