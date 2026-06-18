import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PeriodPreset } from "./types";

/** Console API paths — mirrors backend `/wifi/analytics/revenue` */
export const ANALYTICS_REVENUE_API = buildWifiApiRoutes("/wifi/analytics/revenue");

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
];

export const DEFAULT_PRESET: PeriodPreset = "30d";
