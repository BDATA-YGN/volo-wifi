import { COOKIES_CONSTANTS, HTTP_ONLY_COOKIE_NAMES } from "@/utils/constants";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import { PARTNER_ROUTES } from "@/features/mobile/partner/constants";
import { isCaptivePortalPath } from "@/features/captive-portal/subdomain";
import { CONSOLE_LOGIN_PATH } from "@/lib/auth/console-paths";

export type AuthApp = "admin" | "collector" | "customer";

export const AUTH_COOKIE_NAMES: Record<AuthApp, { access: string; refresh: string }> = {
  admin: {
    access: HTTP_ONLY_COOKIE_NAMES.ACCESS_TOKEN,
    refresh: HTTP_ONLY_COOKIE_NAMES.REFRESH_TOKEN,
  },
  collector: {
    access: "sms_collector_access_token",
    refresh: "sms_collector_refresh_token",
  },
  customer: {
    access: "sms_customer_access_token",
    refresh: "sms_customer_refresh_token",
  },
};

export const SMS_MOBILE_ACTOR_HEADER = "x-sms-mobile-actor";

/** Cookie names forwarded to the API for each app (keeps sessions isolated in one browser). */
export function cookieNamesForAuthApp(app: AuthApp): string[] {
  const base = [AUTH_COOKIE_NAMES[app].access, AUTH_COOKIE_NAMES[app].refresh];
  if (app === "admin") {
    return [
      ...base,
      COOKIES_CONSTANTS.MENUS,
      COOKIES_CONSTANTS.AUTHORIZATION,
      COOKIES_CONSTANTS.X_USER_ACCESS,
      COOKIES_CONSTANTS.X_USER_ROLE,
      COOKIES_CONSTANTS.X_USER_HISTORY,
    ];
  }
  return base;
}

export function loginPathForAuthApp(pathname: string): string {
  if (pathname.startsWith("/collector")) return MOBILE_ROUTES.collector.login;
  if (pathname.startsWith("/customer")) return MOBILE_ROUTES.customer.login;
  if (pathname.startsWith("/partner")) return PARTNER_ROUTES.login;
  return CONSOLE_LOGIN_PATH;
}

export function isMobileWebPath(pathname: string): boolean {
  return (
    pathname === MOBILE_ROUTES.collector.root ||
    pathname.startsWith(`${MOBILE_ROUTES.collector.root}/`) ||
    pathname === MOBILE_ROUTES.customer.root ||
    pathname.startsWith(`${MOBILE_ROUTES.customer.root}/`) ||
    pathname === PARTNER_ROUTES.root ||
    pathname.startsWith(`${PARTNER_ROUTES.root}/`)
  );
}

/** Admin console features (socket, theme API) should not run on mobile or public auth pages. */
export function shouldRunAdminConsoleClient(pathname: string): boolean {
  if (!pathname || isMobileWebPath(pathname) || isCaptivePortalPath(pathname)) return false;
  if (
    pathname === "/" ||
    pathname === CONSOLE_LOGIN_PATH ||
    pathname.startsWith(`${CONSOLE_LOGIN_PATH}/`) ||
    pathname === "/signin" ||
    pathname.startsWith("/signin/") ||
    pathname === "/unauthorized" ||
    pathname.startsWith("/unauthorized/") ||
    pathname.startsWith("/verify")
  ) {
    return false;
  }
  return true;
}
