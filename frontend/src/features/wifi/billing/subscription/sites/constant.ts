import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";

export const BILLING_SUBSCRIPTION_SITES_API = buildWifiApiRoutes(
  "/wifi/billing/subscription/sites"
);

export { TIER_CODE_COLORS, resolveTierColor } from "@/features/wifi/shared/tier-colors";

export const STATION_STATUS_COLOR: Record<string, string> = {
  ACTIVE: "success",
  MAINTENANCE: "processing",
  DISABLED: "default",
};
