import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAMES } from "@/lib/auth/cookies";
import { PARTNER_ROUTES } from "./constants";
import { isPartnerPath } from "./subdomain";

function hasPartnerSessionCookies(request: NextRequest): boolean {
  const access = request.cookies.get(AUTH_COOKIE_NAMES.partner.access)?.value;
  const refresh = request.cookies.get(AUTH_COOKIE_NAMES.partner.refresh)?.value;
  return Boolean(access && refresh);
}

/** Session gate for `/partner/*` (isolated `partner_*` cookies). */
export function handlePartnerProxyAuth(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!isPartnerPath(pathname)) return null;

  const isLoginPage = pathname === PARTNER_ROUTES.login;

  // Always allow the login form — stale cookies alone must not skip sign-in.
  if (isLoginPage) {
    return NextResponse.next();
  }

  if (!hasPartnerSessionCookies(request)) {
    return NextResponse.redirect(new URL(PARTNER_ROUTES.login, request.url));
  }

  return NextResponse.next();
}
