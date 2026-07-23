import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";

export const BILLING_TIER_RATES_TENANT_API = buildWifiApiRoutes(
  "/wifi/billing/tier-rates/tenant"
);

export { TIER_CODE_COLORS, resolveTierColor } from "@/features/wifi/shared/tier-colors";

export const DEFAULT_CURRENCY = "MMK";
