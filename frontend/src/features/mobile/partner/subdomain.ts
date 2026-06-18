import { PARTNER_ROUTES } from "./constants";
import { hostWithoutPort } from "@/features/mobile/shared/subdomain";

export const PARTNER_HOST =
  process.env.NEXT_PUBLIC_PARTNER_HOST ??
  process.env.PARTNER_HOST ??
  "partner.volowifi.com";

const PARTNER_SUBDOMAIN_SHARED_PREFIXES = [
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
  "/partner/sw.js",
  "/partner/manifest.webmanifest",
];

export function isPartnerHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = hostWithoutPort(host);
  return hostname === PARTNER_HOST || hostname === `www.${PARTNER_HOST}`;
}

export function isPartnerPath(pathname: string): boolean {
  return (
    pathname === PARTNER_ROUTES.root || pathname.startsWith(`${PARTNER_ROUTES.root}/`)
  );
}

export function isPartnerSubdomainSharedPath(pathname: string): boolean {
  return PARTNER_SUBDOMAIN_SHARED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}
