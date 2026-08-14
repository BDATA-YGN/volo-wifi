import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PeriodPreset } from "./types";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

/** Console API paths — mirrors backend `/wifi/analytics/sites` */
export const ANALYTICS_SITES_API = buildWifiApiRoutes("/wifi/analytics/sites");

export const DEFAULT_PRESET: PeriodPreset = "today";

export const DEFAULT_PERIOD: PeriodPreset = "today";

export const SITE_ANALYTICS_TABS = [
  { key: "stats", label: "Stats" },
  { key: "sites", label: "Sites" },
  { key: "tiers", label: "Tiers" },
] as const;

export const DEFAULT_TAB = "stats" as const;

function startOfWeekMonday(value: Dayjs) {
  return value.startOf("day").subtract((value.day() + 6) % 7, "day");
}

export function todayRange(now = dayjs()): [Dayjs, Dayjs] {
  return [now.startOf("day"), now.endOf("day")];
}

export function isTodayRange(from: Dayjs, to: Dayjs, now = dayjs()) {
  return from.isSame(now, "day") && to.isSame(now, "day");
}

export function rangeFromPeriodPreset(preset: PeriodPreset, now = dayjs()): [Dayjs, Dayjs] {
  const today = now.startOf("day");
  if (preset === "7d") return [today.subtract(6, "day"), today.endOf("day")];
  if (preset === "30d") return [today.subtract(29, "day"), today.endOf("day")];
  if (preset === "90d") return [today.subtract(89, "day"), today.endOf("day")];
  return todayRange(now);
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
    {
      label: "Last month",
      value: [lastMonthStart, monthStart.subtract(1, "day").endOf("day")],
    },
    { label: "Last 7 days", value: [today.subtract(6, "day"), today.endOf("day")] },
    { label: "Last 30 days", value: [today.subtract(29, "day"), today.endOf("day")] },
  ];
}
