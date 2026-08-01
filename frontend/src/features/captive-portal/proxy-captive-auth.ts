import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAMES } from "@/lib/auth/cookies";
import { CAPTIVE_ROUTES } from "@/features/captive-portal/constants";
import {
  captiveAuthPath,
  captiveDashboardPath,
  isCaptiveHost,
  isCaptivePortalPath,
} from "@/features/captive-portal/subdomain";

function isCaptiveRouterLoginPath(pathname: string): boolean {
  return (
    pathname === CAPTIVE_ROUTES.routerLogin ||
    pathname === CAPTIVE_ROUTES.routerLoginShort
  );
}

function isCaptiveAuthPath(pathname: string): boolean {
  return pathname === CAPTIVE_ROUTES.auth || pathname === CAPTIVE_ROUTES.authShort;
}

function isCaptiveDashboardPath(pathname: string): boolean {
  return pathname === CAPTIVE_ROUTES.dashboard || pathname === CAPTIVE_ROUTES.dashboardShort;
}

/** Session gate for captive portal routes (`portal_*` cookies). */
export function handleCaptiveProxyAuth(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!isCaptivePortalPath(pathname)) return null;

  const token = request.cookies.get(AUTH_COOKIE_NAMES.captive.access)?.value;
  const host = request.headers.get("host");
  const authPath = captiveAuthPath(host);
  const dashboardPath = captiveDashboardPath(host);

  if (isCaptiveAuthPath(pathname)) {
    if (token) {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  if (isCaptiveRouterLoginPath(pathname)) {
    if (!token) {
      return NextResponse.redirect(new URL(authPath, request.url));
    }
    return NextResponse.next();
  }

  if (isCaptiveDashboardPath(pathname) && !token) {
    return NextResponse.redirect(new URL(authPath, request.url));
  }

  return NextResponse.next();
}

/** On captive.volowifi.com, root `/` should open the login page. */
export function handleCaptiveSubdomainRoot(request: NextRequest): NextResponse | null {
  if (!isCaptiveHost(request.headers.get("host"))) return null;

  const { pathname } = request.nextUrl;
  if (pathname !== "/") return null;

  return NextResponse.redirect(new URL("/portal/auth", request.url));
}
