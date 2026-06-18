import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";

export const BILLING_TIER_RATES_TENANT_API = buildWifiApiRoutes(
  "/wifi/billing/tier-rates/tenant"
);

export const TIER_CODE_COLORS: Record<string, string> = {
  SMALL: "blue",
  MEDIUM: "cyan",
  LARGE: "purple",
  XL: "geekblue",
};

export const DEFAULT_CURRENCY = "MMK";
