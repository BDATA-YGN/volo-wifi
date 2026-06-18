import { redirect } from "next/navigation";
import { CAPTIVE_ROUTES } from "@/features/captive-portal/constants";

export default function PortalIndexPage() {
  redirect(CAPTIVE_ROUTES.auth);
}
