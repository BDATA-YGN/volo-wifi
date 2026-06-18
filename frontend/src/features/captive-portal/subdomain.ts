import { CAPTIVE_ROUTES } from "./constants";

export const CAPTIVE_HOST =
  process.env.NEXT_PUBLIC_CAPTIVE_HOST ??
  process.env.CAPTIVE_HOST ??
  "captive.volowifi.com";

export function hostWithoutPort(host: string): string {
  return host.split(":")[0].toLowerCase();
}

export function isCaptiveHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = hostWithoutPort(host);
  return hostname === CAPTIVE_HOST || hostname === `www.${CAPTIVE_HOST}`;
}

export function captiveAuthPath(host?: string | null): string {
  return isCaptiveHost(host ?? null) ? "/auth" : CAPTIVE_ROUTES.auth;
}

export function captiveDashboardPath(host?: string | null): string {
  return isCaptiveHost(host ?? null) ? "/dashboard" : CAPTIVE_ROUTES.dashboard;
}

export function captiveRouterLoginPath(host?: string | null): string {
  return isCaptiveHost(host ?? null)
    ? CAPTIVE_ROUTES.routerLoginShort
    : CAPTIVE_ROUTES.routerLogin;
}

export function isCaptivePortalPath(pathname: string): boolean {
  return (
    pathname === CAPTIVE_ROUTES.root ||
    pathname.startsWith(`${CAPTIVE_ROUTES.root}/`) ||
    pathname === CAPTIVE_ROUTES.authShort ||
    pathname === CAPTIVE_ROUTES.dashboardShort ||
    pathname === CAPTIVE_ROUTES.routerLoginShort
  );
}
