import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import dayjs from "dayjs";

/** Console API paths — mirrors backend `/wifi/analytics/revenue` */
export const ANALYTICS_REVENUE_API = buildWifiApiRoutes("/wifi/analytics/revenue");

export function currentMonthKey(): string {
  return dayjs().format("YYYY-MM");
}
