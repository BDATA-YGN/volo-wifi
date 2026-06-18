import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { OrgLicenseStatus } from "./types";

/** Console API paths — mirrors backend `/wifi/tenants` */
export const TENANTS_API = buildWifiApiRoutes("/wifi/tenants");

export const LICENSE_STATUS_OPTIONS: {
  value: OrgLicenseStatus;
  label: string;
  color: string;
}[] = [
  { value: "ACTIVE", label: "Active", color: "success" },
  { value: "SUSPENDED", label: "Suspended", color: "warning" },
  { value: "EXPIRED", label: "Expired", color: "default" },
  { value: "CANCELLED", label: "Cancelled", color: "error" },
];

export const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  EXPIRED: "default",
  CANCELLED: "error",
};
