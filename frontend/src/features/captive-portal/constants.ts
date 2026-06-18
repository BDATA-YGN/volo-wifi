/** Local dev uses `/portal/*`; production captive host uses short paths (`/auth`, `/dashboard`). */
export const CAPTIVE_ROUTES = {
  root: "/portal",
  auth: "/portal/auth",
  dashboard: "/portal/dashboard",
  routerLogin: "/portal/router-login",
  authShort: "/auth",
  dashboardShort: "/dashboard",
  routerLoginShort: "/router-login",
} as const;

export const CAPTIVE_NAS_STORAGE_KEY = "volo_captive_nas_params";
export const CAPTIVE_ROUTER_CREDENTIAL_KEY = "volo_captive_router_credential";
export const CAPTIVE_ROUTER_PASSWORD_KEY = "volo_captive_router_password";

export const CAPTIVE_API_PREFIX = "/portal-api";
