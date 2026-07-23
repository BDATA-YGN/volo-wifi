import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PlanQuotaType, PlanTimeUsageMode, UnitTime } from "./types";

/** Console API paths — mirrors backend `/wifi/catalog/service-plans` */
export const CATALOG_SERVICE_PLANS_API = buildWifiApiRoutes("/wifi/catalog/service-plans");

export const PLAN_CODE_PATTERN = /^[A-Z][A-Z0-9_-]{0,47}$/;

export const QUOTA_TYPE_OPTIONS: { value: PlanQuotaType; label: string; description: string }[] =
  [
    {
      value: "TIME_ONLY",
      label: "Time only",
      description: "Session duration quota (e.g. 1 hour WiFi)",
    },
    {
      value: "DATA_ONLY",
      label: "Data only",
      description: "Data volume quota in megabytes",
    },
    {
      value: "TIME_AND_DATA",
      label: "Time + data",
      description: "Combined time and data limits",
    },
  ];

export const TIME_UNIT_OPTIONS: { value: UnitTime; label: string }[] = [
  { value: "MINUTE", label: "Minutes" },
  { value: "HOUR", label: "Hours" },
  { value: "DAY", label: "Days" },
  { value: "MONTH", label: "Months" },
];

export const TIME_USAGE_MODE_OPTIONS: { value: PlanTimeUsageMode; label: string }[] = [
  { value: "CUMULATIVE_SESSIONS", label: "Cumulative across sessions" },
  { value: "SINGLE_SESSION", label: "Single session only" },
];

export const QUOTA_TYPE_COLOR: Record<PlanQuotaType, string> = {
  TIME_ONLY: "blue",
  DATA_ONLY: "purple",
  TIME_AND_DATA: "cyan",
};
