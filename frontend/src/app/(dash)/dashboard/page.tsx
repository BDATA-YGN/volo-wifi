import { redirect } from "next/navigation";
import { CONSOLE_HOME_PATH } from "@/lib/auth/console-paths";

export default function LegacyDashboardPage() {
  redirect(CONSOLE_HOME_PATH);
}
