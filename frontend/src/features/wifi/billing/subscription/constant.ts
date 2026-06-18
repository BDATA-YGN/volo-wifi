import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";

export const BILLING_SUBSCRIPTION_API = buildWifiApiRoutes("/wifi/billing/subscription");

export const LICENSE_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active", color: "success" },
  { value: "SUSPENDED", label: "Suspended", color: "warning" },
  { value: "EXPIRED", label: "Expired", color: "default" },
  { value: "CANCELLED", label: "Cancelled", color: "error" },
] as const;

export const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  EXPIRED: "default",
  CANCELLED: "error",
};
