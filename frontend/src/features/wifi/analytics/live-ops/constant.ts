import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { WindowHours } from "./types";

/** Console API paths — mirrors backend `/wifi/analytics/live-ops` */
export const ANALYTICS_LIVE_OPS_API = buildWifiApiRoutes("/wifi/analytics/live-ops");

export const WINDOW_OPTIONS: { value: WindowHours; label: string }[] = [
  { value: 1, label: "Last 1 hour" },
  { value: 6, label: "Last 6 hours" },
  { value: 24, label: "Last 24 hours" },
];

export const DEFAULT_WINDOW_HOURS: WindowHours = 24;

export const AUTO_REFRESH_MS = 30_000;

export const SESSION_STATUS_COLOR: Record<string, string> = {
  START: "processing",
  INTERIM: "cyan",
  STOP: "default",
};
