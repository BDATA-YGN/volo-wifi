import { COOKIES_CONSTANTS, HTTP_ONLY_COOKIE_NAMES } from "@/utils/constants";
import { PARTNER_ROUTES } from "@/features/mobile/partner/constants";
import { isCaptivePortalPath } from "@/features/captive-portal/subdomain";
import { CONSOLE_LOGIN_PATH } from "@/lib/auth/console-paths";

/**
 * Concurrent browser sessions:
 * - admin  → /wifi console (`access_token`)
 * - partner → /partner (`partner_access_token`)
 * - captive → /portal (`portal_access_token`)
 *
 * collector/customer remain for legacy feature modules only (routes removed).
 */
export type AuthApp = "admin" | "partner" | "captive" | "collector" | "customer";

/** Sent on API calls so the backend picks the matching cookie pair. */
export const AUTH_APP_HEADER = "x-auth-app";

/** Legacy SMS mobile actor header (collector/customer feature modules). */
export const SMS_MOBILE_ACTOR_HEADER = "x-sms-mobile-actor";

export const AUTH_COOKIE_NAMES: Record<AuthApp, { access: string; refresh: string }> = {
  admin: {
    access: HTTP_ONLY_COOKIE_NAMES.ACCESS_TOKEN,
    refresh: HTTP_ONLY_COOKIE_NAMES.REFRESH_TOKEN,
  },
  partner: {
    access: "partner_access_token",
    refresh: "partner_refresh_token",
  },
  captive: {
    access: "portal_access_token",
    refresh: "portal_refresh_token",
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

export function authAppFromPathname(pathname: string): AuthApp {
  if (pathname.startsWith("/partner")) return "partner";
  if (pathname.startsWith("/portal") || isCaptivePortalPath(pathname)) return "captive";
  return "admin";
}

export function loginPathForAuthApp(pathname: string): string {
  if (pathname.startsWith("/partner")) return PARTNER_ROUTES.login;
  if (pathname.startsWith("/portal") || isCaptivePortalPath(pathname)) {
    return "/portal/auth";
  }
  return CONSOLE_LOGIN_PATH;
}

/** Partner (and legacy mobile) paths that use the mobile chrome. */
export function isMobileWebPath(pathname: string): boolean {
  return (
    pathname === PARTNER_ROUTES.root || pathname.startsWith(`${PARTNER_ROUTES.root}/`)
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
