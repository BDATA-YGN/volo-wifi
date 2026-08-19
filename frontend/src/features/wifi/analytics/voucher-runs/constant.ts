import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import dayjs from "dayjs";

/** Console API paths — mirrors backend `/wifi/analytics/voucher-runs` */
export const ANALYTICS_VOUCHER_RUNS_API = buildWifiApiRoutes("/wifi/analytics/voucher-runs");

export function currentMonthKey(): string {
  return dayjs().format("YYYY-MM");
}

export function monthPeriod(monthKey: string): { periodFrom: string; periodTo: string } {
  const start = dayjs(`${monthKey}-01`).startOf("month");
  return {
    periodFrom: start.toISOString(),
    periodTo: start.endOf("month").toISOString(),
  };
}

export function formatMonthLabel(monthKey: string): string {
  return dayjs(`${monthKey}-01`).format("MMM YYYY");
}
