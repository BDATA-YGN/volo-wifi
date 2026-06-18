import type { Metadata } from "next";
import CaptiveLoginPage from "@/features/captive-portal/components/CaptiveLoginPage";

export const metadata: Metadata = {
  title: "Login",
};

export default function PortalAuthPage() {
  return <CaptiveLoginPage />;
}
