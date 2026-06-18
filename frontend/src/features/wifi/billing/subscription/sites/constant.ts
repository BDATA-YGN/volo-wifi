import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";

export const BILLING_SUBSCRIPTION_SITES_API = buildWifiApiRoutes(
  "/wifi/billing/subscription/sites"
);

export const TIER_CODE_COLORS: Record<string, string> = {
  SMALL: "blue",
  MEDIUM: "cyan",
  LARGE: "purple",
  XL: "geekblue",
};

export const STATION_STATUS_COLOR: Record<string, string> = {
  ACTIVE: "success",
  MAINTENANCE: "processing",
  DISABLED: "default",
};
