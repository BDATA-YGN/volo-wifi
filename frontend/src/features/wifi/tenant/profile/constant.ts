import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";

/** Console API paths — mirrors backend `/wifi/tenant/profile` */
export const TENANT_PROFILE_API = buildWifiApiRoutes("/wifi/tenant/profile");

export const LICENSE_STATUS_COLOR: Record<string, string> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  EXPIRED: "default",
  CANCELLED: "error",
};
