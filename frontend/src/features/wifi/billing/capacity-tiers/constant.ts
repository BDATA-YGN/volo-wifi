import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";

/** Console API paths — mirrors backend `/wifi/billing/capacity-tiers` */
export const BILLING_CAPACITY_TIERS_API = buildWifiApiRoutes("/wifi/billing/capacity-tiers");

export const TIER_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,31}$/;

export const TOKEN_USAGE_SCOPE_OPTIONS = [
  {
    value: "SITE" as const,
    label: "Site only",
    description: "Token works only at the shop that sold it.",
  },
  {
    value: "TIER" as const,
    label: "Same tier sites",
    description: "Token works at any site with this same capacity tier.",
  },
  {
    value: "ALL" as const,
    label: "All sites",
    description: "Token works at any site in the organization (default).",
  },
];

export const TOKEN_USAGE_SCOPE_LABEL: Record<string, string> = {
  SITE: "Site only",
  TIER: "Same tier",
  ALL: "All sites",
};

export const PLATFORM_SETUP_STEPS = [
  {
    key: "capacity-tiers",
    title: "Capacity Tiers",
    description: "Define site size types (SMALL, MEDIUM, LARGE) used for license billing.",
    active: true,
    href: "/wifi/billing/capacity-tiers",
  },
  {
    key: "platform-rates",
    title: "Platform Tier Rates",
    description: "Set the default monthly license price for each capacity tier.",
    active: false,
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
