import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PeriodPreset } from "./types";

/** Console API paths — mirrors backend `/wifi/analytics/partners` */
export const ANALYTICS_PARTNERS_API = buildWifiApiRoutes("/wifi/analytics/partners");

export const DEFAULT_PRESET: PeriodPreset = "today";
export const DEFAULT_PERIOD: PeriodPreset = "today";

export const PARTNER_ANALYTICS_TABS = [
  { key: "stats", label: "Stats" },
  { key: "partners", label: "Partner" },
] as const;

export const DEFAULT_TAB = "stats" as const;
