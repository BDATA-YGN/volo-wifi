import { redirect } from "next/navigation";
import { CONSOLE_LOGIN_PATH } from "@/lib/auth/console-paths";

/** Legacy path — console login lives at `/wifi/login`. */
export default function LegacySignInRedirect() {
  redirect(CONSOLE_LOGIN_PATH);
}
