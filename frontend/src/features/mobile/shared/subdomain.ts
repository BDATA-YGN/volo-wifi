import { MOBILE_ROUTES } from "./constants";
import type { MobileActorType } from "./types";

export const CUSTOMER_HOST =
  process.env.NEXT_PUBLIC_CUSTOMER_HOST ??
  process.env.CUSTOMER_HOST ??
  "customer.volowifi.com";

export const COLLECTOR_HOST =
  process.env.NEXT_PUBLIC_COLLECTOR_HOST ??
  process.env.COLLECTOR_HOST ??
  "collector.volowifi.com";

/** Paths allowed on mobile subdomains without the /collector or /customer prefix. */
const MOBILE_SUBDOMAIN_SHARED_PREFIXES = [
  "/health",
  "/api/",
  "/_next/",
  "/uploads/",
  "/images/",
  "/assets/",
  "/storage/",
  "/file-proxy/",
  "/basic/",
  "/fonts/",
  "/logo.png",
  "/collector/sw.js",
  "/customer/sw.js",
  "/collector/manifest.webmanifest",
  "/customer/manifest.webmanifest",
  "/portal-api/",
];

export function hostWithoutPort(host: string): string {
  return host.split(":")[0].toLowerCase();
}

export function mobileAppFromHost(host: string | null | undefined): MobileActorType | null {
  if (!host) return null;
  const hostname = hostWithoutPort(host);
  if (hostname === CUSTOMER_HOST || hostname === `www.${CUSTOMER_HOST}`) {
    return "customer";
  }
  if (hostname === COLLECTOR_HOST || hostname === `www.${COLLECTOR_HOST}`) {
    return "collector";
  }
  return null;
}

export function mobileAppFromPathname(pathname: string): MobileActorType | null {
  if (pathname === MOBILE_ROUTES.collector.root || pathname.startsWith(`${MOBILE_ROUTES.collector.root}/`)) {
    return "collector";
  }
  if (pathname === MOBILE_ROUTES.customer.root || pathname.startsWith(`${MOBILE_ROUTES.customer.root}/`)) {
    return "customer";
  }
  return null;
}

export function isMobileSubdomainSharedPath(pathname: string): boolean {
  return MOBILE_SUBDOMAIN_SHARED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}
