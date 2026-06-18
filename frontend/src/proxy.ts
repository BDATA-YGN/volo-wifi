import { NextRequest, NextResponse } from "next/server";
import { COOKIES_CONSTANTS, HTTP_ONLY_COOKIE_NAMES } from "@/utils/constants";
import { handleMobileProxyAuth } from "@/features/mobile/shared/proxy-mobile-auth";
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
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import {
  isMobileSubdomainSharedPath,
  mobileAppFromHost,
  mobileAppFromPathname,
} from "@/features/mobile/shared/subdomain";
import * as lzString from 'lz-string';
import { withForwardedClientIpHeaders } from "@/lib/http/client-ip";

function nextWithClientIp(request: NextRequest): NextResponse {
  return NextResponse.next({
    request: { headers: withForwardedClientIpHeaders(request) },
  });
}

const publicUrls = ["/signin", "/unauthorized", "/health", "/uploads", "/assets", "/basic", "/fonts", "/images", "/storage", "/file-proxy", "/verify", "/collector/login", "/customer/login", "/partner/login", "/portal", "/portal-api"];
const SKIP_PATH_REGEX =
  /^(\/images\/.*|\/uploads\/.*|\/assets\/.*|\/storage\/.*|\/file-proxy\/.*|\/portal-api\/.*|\/basic\/.*|\/fonts\/.*|\/logo\.png|\/_next\/static|\/_next\/image|.*\.png|.*\.svg|.*\.webp|\/collector\/sw\.js|\/customer\/sw\.js|\/partner\/sw\.js|\/collector\/manifest\.webmanifest|\/customer\/manifest\.webmanifest|\/partner\/manifest\.webmanifest)$/;

const REDIRECT_URLS = {
  unauthorized: "/unauthorized",
  signin: "/signin"
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

/** On mobile subdomains, non-prefixed paths (e.g. /profile) must not hit admin routes. */
function handleMobileSubdomainCanonicalPaths(request: NextRequest): NextResponse | null {
  const app = mobileAppFromHost(request.headers.get("host"));
  if (!app) return null;

  const { pathname } = request.nextUrl;
  const root = MOBILE_ROUTES[app].root;

  if (mobileAppFromPathname(pathname) === app) {
    return null;
  }

  if (isMobileSubdomainSharedPath(pathname) || SKIP_PATH_REGEX.test(pathname)) {
    return nextWithClientIp(request);
  }

  return NextResponse.redirect(new URL(root, request.url));
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

  const subdomainCanonicalResponse = handleMobileSubdomainCanonicalPaths(request);
  if (subdomainCanonicalResponse) {
    return subdomainCanonicalResponse;
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

  const mobileAuthResponse = handleMobileProxyAuth(request);
  if (mobileAuthResponse) {
    if (!mobileAuthResponse.headers.get("location")) {
      return nextWithClientIp(request);
    }
    return mobileAuthResponse;
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

  if (mobileAppFromHost(request.headers.get("host"))) {
    return nextWithClientIp(request);
  }

  if (isCaptiveHost(request.headers.get("host"))) {
    return nextWithClientIp(request);
  }

  if (isPartnerHost(request.headers.get("host"))) {
    return nextWithClientIp(request);
  }

  if (publicUrls.some(url => pathname.startsWith(url))) {
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

  if (!isRouteAccessible(pathname, userAccess)) {
    const unauthorizedUrl = new URL(REDIRECT_URLS.unauthorized, request.url);
    return NextResponse.redirect(unauthorizedUrl);
  }

  return nextWithClientIp(request);
}

/** Routes available to every authenticated user, regardless of role permissions. */
const ALWAYS_ALLOWED_PREFIXES = ["/", "/profile", "/timeline"];

function isRouteAccessible(path: string, userRoles: any): boolean {
  if (ALWAYS_ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return true;
  }

  if (!userRoles) return false;

  const pathAliases =
    path === "/" || path === ""
      ? ["/", "/dashboard"]
      : path === "/dashboard"
        ? ["/dashboard", "/"]
        : [path];

  for (const p of pathAliases) {
    if (userRoles[p]?.access) return true;
  }

  return Object.entries(userRoles).some(([routePath, config]: [string, any]) => {
    if (!config.access) return false;
    const routePattern = routePath.replace(/\[\w+\]/g, '[^/]+').replace(/\*/g, '.*');
    const regex = new RegExp(`^${routePattern}$`);
    return regex.test(path) || path.startsWith(routePath);
  });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
