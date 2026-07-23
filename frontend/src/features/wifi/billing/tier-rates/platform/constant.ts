import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";

export const BILLING_TIER_RATES_PLATFORM_API = buildWifiApiRoutes(
  "/wifi/billing/tier-rates/platform"
);

export const PLATFORM_SETUP_STEPS = [
  {
    key: "capacity-tiers",
    title: "Capacity Tiers",
    description: "Define site size types (SMALL, MEDIUM, LARGE).",
    active: false,
    href: "/wifi/billing/capacity-tiers",
  },
  {
    key: "platform-rates",
    title: "Platform Tier Rates",
    description: "Set the default monthly license price per capacity tier.",
    active: true,
    href: "/wifi/billing/tier-rates/platform",
  },
  {
    key: "tenant-registration",
    title: "Tenant Registration",
    description: "Onboard organizations once tiers and rates are configured.",
    active: false,
    href: "/wifi/billing/tenant-registration",
  },
] as const;

export { TIER_CODE_COLORS, resolveTierColor } from "@/features/wifi/shared/tier-colors";

export const DEFAULT_CURRENCY = "MMK";
