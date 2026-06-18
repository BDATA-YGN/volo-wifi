import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAMES } from "@/lib/auth/cookies";
import { MOBILE_ROUTES } from "./constants";
import { mobileAppFromPathname } from "./subdomain";
import type { MobileActorType } from "./types";

function loginPathFor(app: MobileActorType): string {
  return app === "collector" ? MOBILE_ROUTES.collector.login : MOBILE_ROUTES.customer.login;
}

function homePathFor(app: MobileActorType): string {
  return app === "collector" ? MOBILE_ROUTES.collector.home : MOBILE_ROUTES.customer.home;
}

function tokenForApp(request: NextRequest, app: MobileActorType): string | undefined {
  const names = AUTH_COOKIE_NAMES[app];
  return request.cookies.get(names.access)?.value;
}

/**
 * Session gate for canonical /collector/* and /customer/* routes.
 * URLs always keep the app prefix (including on dedicated subdomains).
 */
export function handleMobileProxyAuth(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const app = mobileAppFromPathname(pathname);
  if (!app) return null;

  const token = tokenForApp(request, app);
  const isLoginPage = pathname === loginPathFor(app);

  if (isLoginPage) {
    if (token) {
      return NextResponse.redirect(new URL(homePathFor(app), request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL(loginPathFor(app), request.url));
  }

  return NextResponse.next();
}
