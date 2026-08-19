import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PeriodPreset } from "./types";
import dayjs, { type Dayjs } from "dayjs";

/** Console API paths — mirrors backend `/wifi/analytics/access-tokens` */
export const ANALYTICS_ACCESS_TOKENS_API = buildWifiApiRoutes("/wifi/analytics/access-tokens");

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export const DEFAULT_PRESET: PeriodPreset = "today";

function startOfWeekMonday(value: Dayjs) {
  return value.startOf("day").subtract((value.day() + 6) % 7, "day");
}

export function dateRangePresets(now = dayjs()): { label: string; value: [Dayjs, Dayjs] }[] {
  const today = now.startOf("day");
  const yesterday = today.subtract(1, "day");
  const weekStart = startOfWeekMonday(today);
  const lastWeekStart = weekStart.subtract(7, "day");
  const monthStart = today.startOf("month");
  const lastMonthStart = monthStart.subtract(1, "month");

  return [
    { label: "Today", value: [today, today.endOf("day")] },
    { label: "Yesterday", value: [yesterday, yesterday.endOf("day")] },
    { label: "This week", value: [weekStart, today.endOf("day")] },
    { label: "Last week", value: [lastWeekStart, weekStart.subtract(1, "day").endOf("day")] },
    { label: "This month", value: [monthStart, today.endOf("day")] },
    { label: "Last month", value: [lastMonthStart, monthStart.subtract(1, "day").endOf("day")] },
    { label: "Last 7 days", value: [today.subtract(6, "day"), today.endOf("day")] },
    { label: "Last 30 days", value: [today.subtract(29, "day"), today.endOf("day")] },
  ];
}
