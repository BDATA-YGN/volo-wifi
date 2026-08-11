import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PeriodPreset } from "./types";

/** Console API paths — mirrors backend `/wifi/analytics/sites` */
export const ANALYTICS_SITES_API = buildWifiApiRoutes("/wifi/analytics/sites");

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export const DEFAULT_PRESET: PeriodPreset = "today";

export const SITE_ANALYTICS_TABS = [
  { key: "stats", label: "Stats" },
  { key: "sites", label: "By site" },
  { key: "tiers", label: "By tier" },
] as const;

export const DEFAULT_TAB = "stats" as const;
export const DEFAULT_SITES_PAGE = 1;
export const DEFAULT_SITES_PAGE_SIZE = 10;
