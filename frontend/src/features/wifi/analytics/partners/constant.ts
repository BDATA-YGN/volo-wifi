import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PeriodPreset } from "./types";

/** Console API paths — mirrors backend `/wifi/analytics/partners` */
export const ANALYTICS_PARTNERS_API = buildWifiApiRoutes("/wifi/analytics/partners");

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export const DEFAULT_PRESET: PeriodPreset = "30d";
