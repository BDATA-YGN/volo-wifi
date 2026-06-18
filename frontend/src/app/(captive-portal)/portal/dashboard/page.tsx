import type { Metadata } from "next";
import CaptiveDashboardPage from "@/features/captive-portal/components/CaptiveDashboardPage";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function PortalDashboardPage() {
  return <CaptiveDashboardPage />;
}
