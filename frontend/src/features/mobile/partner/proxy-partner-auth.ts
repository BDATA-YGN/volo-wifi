import { NextRequest, NextResponse } from "next/server";
import { HTTP_ONLY_COOKIE_NAMES } from "@/utils/constants";
import { PARTNER_ROUTES } from "./constants";
import { isPartnerPath } from "./subdomain";

function hasConsoleSessionCookies(request: NextRequest): boolean {
  const access = request.cookies.get(HTTP_ONLY_COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const refresh = request.cookies.get(HTTP_ONLY_COOKIE_NAMES.REFRESH_TOKEN)?.value;
  return Boolean(access && refresh);
}

/** Session gate for `/partner/*` routes (console admin cookies, PARTNER role at login). */
export function handlePartnerProxyAuth(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!isPartnerPath(pathname)) return null;

  const isLoginPage = pathname === PARTNER_ROUTES.login;

  // Always allow the login form — stale `access_token` alone must not skip sign-in.
  if (isLoginPage) {
    return NextResponse.next();
  }

  if (!hasConsoleSessionCookies(request)) {
    return NextResponse.redirect(new URL(PARTNER_ROUTES.login, request.url));
  }

  return NextResponse.next();
}
