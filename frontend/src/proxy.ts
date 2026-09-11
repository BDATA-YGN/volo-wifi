import { NextRequest, NextResponse } from "next/server";
import { COOKIES_CONSTANTS, HTTP_ONLY_COOKIE_NAMES } from "@/utils/constants";
import { handlePartnerProxyAuth } from "@/features/mobile/partner/proxy-partner-auth";
import {
  isPartnerHost,
  isPartnerPath,
  isPartnerSubdomainSharedPath,
} from "@/features/mobile/partner/subdomain";
import { PARTNER_ROUTES } from "@/features/mobile/partner/constants";
import {
  handleCaptiveProxyAuth,
  handleCaptiveSubdomainRoot,
} from "@/features/captive-portal/proxy-captive-auth";
import { isCaptivePortalPath, isCaptiveHost } from "@/features/captive-portal/subdomain";
import * as lzString from 'lz-string';
import { withForwardedClientIpHeaders } from "@/lib/http/client-ip";
import { CONSOLE_LOGIN_PATH } from "@/lib/auth/console-paths";
import { isRouteAccessible } from "@/lib/auth/route-access";

function nextWithClientIp(request: NextRequest): NextResponse {
  return NextResponse.next({
    request: { headers: withForwardedClientIpHeaders(request) },
  });
}

const publicUrls = [
  CONSOLE_LOGIN_PATH,
  "/signin",
  "/unauthorized",
  "/health",
  "/uploads",
  "/assets",
  "/basic",
  "/fonts",
  "/images",
  "/storage",
  "/file-proxy",
  "/verify",
  "/partner/login",
  "/portal",
  "/portal-api",
];
const SKIP_PATH_REGEX =
  /^(\/images\/.*|\/uploads\/.*|\/assets\/.*|\/storage\/.*|\/file-proxy\/.*|\/portal-api\/.*|\/basic\/.*|\/fonts\/.*|\/logo\.png|\/_next\/static|\/_next\/image|.*\.png|.*\.svg|.*\.webp|\/partner\/sw\.js|\/partner\/manifest\.webmanifest)$/;

const REDIRECT_URLS = {
  unauthorized: "/unauthorized",
  signin: CONSOLE_LOGIN_PATH,
};

/** On partner subdomain, non-prefixed paths must not hit admin routes. */
function handlePartnerSubdomainCanonicalPaths(request: NextRequest): NextResponse | null {
  if (!isPartnerHost(request.headers.get("host"))) return null;

  const { pathname } = request.nextUrl;
  if (isPartnerPath(pathname)) return null;

  if (isPartnerSubdomainSharedPath(pathname) || SKIP_PATH_REGEX.test(pathname)) {
    return nextWithClientIp(request);
  }

  return NextResponse.redirect(new URL(PARTNER_ROUTES.root, request.url));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SKIP_PATH_REGEX.test(pathname)) {
    return nextWithClientIp(request);
  }

  const captiveRootResponse = handleCaptiveSubdomainRoot(request);
  if (captiveRootResponse) {
    return captiveRootResponse;
  }

  const partnerSubdomainResponse = handlePartnerSubdomainCanonicalPaths(request);
  if (partnerSubdomainResponse) {
    return partnerSubdomainResponse;
  }

  const captiveAuthResponse = handleCaptiveProxyAuth(request);
  if (captiveAuthResponse) {
    if (!captiveAuthResponse.headers.get("location")) {
      return nextWithClientIp(request);
    }
    return captiveAuthResponse;
  }

  if (isCaptivePortalPath(pathname)) {
    return nextWithClientIp(request);
  }

  const partnerAuthResponse = handlePartnerProxyAuth(request);
  if (partnerAuthResponse) {
    if (!partnerAuthResponse.headers.get("location")) {
      return nextWithClientIp(request);
    }
    return partnerAuthResponse;
  }

  if (isPartnerPath(pathname)) {
    return nextWithClientIp(request);
  }

  if (isCaptiveHost(request.headers.get("host"))) {
    return nextWithClientIp(request);
  }

  if (isPartnerHost(request.headers.get("host"))) {
    return nextWithClientIp(request);
  }

  if (pathname === "/" || publicUrls.some((url) => pathname.startsWith(url))) {
    return nextWithClientIp(request);
  }

  const token = request.cookies.get(HTTP_ONLY_COOKIE_NAMES.ACCESS_TOKEN)?.value ||
                request.cookies.get(COOKIES_CONSTANTS.AUTHORIZATION)?.value;

  if (!token) {
    const signInUrl = new URL(REDIRECT_URLS.signin, request.url);
    return NextResponse.redirect(signInUrl);
  }

  const userAccessValue = request.cookies.get(COOKIES_CONSTANTS.MENUS)?.value;

  let userAccess = null;
  if (userAccessValue) {
    try {
      const decompressed = lzString.decompressFromEncodedURIComponent(userAccessValue);
      
      if (decompressed) {
        userAccess = JSON.parse(decompressed);
      } else {
        try {
          userAccess = JSON.parse(decodeURIComponent(userAccessValue));
        } catch (jsonError) {
          console.error("Failed to parse as uncompressed JSON", jsonError);
        }
      }
    } catch (e) {
      console.error("Access parse error", e);
    }
  }

  // Valid session but no RBAC cookie yet (login just issued tokens, or the
  // menus cookie was skipped because it exceeded browser/proxy size limits).
  // Let the dashboard load; `/auth/me` + RouteGuard enforce access on the client.
  if (!userAccess) {
    return nextWithClientIp(request);
  }

  if (!isRouteAccessible(pathname, userAccess)) {
    const unauthorizedUrl = new URL(REDIRECT_URLS.unauthorized, request.url);
    return NextResponse.redirect(unauthorizedUrl);
  }

  return nextWithClientIp(request);
}


export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
