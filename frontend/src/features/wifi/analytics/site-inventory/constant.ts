import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { StationStatus } from "./types";

/** Console API paths — mirrors backend `/wifi/analytics/site-inventory` */
export const ANALYTICS_SITE_INVENTORY_API = buildWifiApiRoutes("/wifi/analytics/site-inventory");

export const STATUS_OPTIONS: { value: StationStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "DISABLED", label: "Disabled" },
];

export const STATION_STATUS_COLOR: Record<StationStatus, string> = {
  ACTIVE: "success",
  MAINTENANCE: "warning",
  DISABLED: "default",
};
