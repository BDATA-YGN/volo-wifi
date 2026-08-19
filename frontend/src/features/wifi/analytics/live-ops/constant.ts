import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { LiveOpsTab } from "./types";

/** Console API paths — mirrors backend `/wifi/analytics/live-ops` */
export const ANALYTICS_LIVE_OPS_API = buildWifiApiRoutes("/wifi/analytics/live-ops");

export const DATE_LOOKBACK_DAYS = 7;

export const LIVE_OPS_TABS: { key: LiveOpsTab; label: string }[] = [
  { key: "stats", label: "Stats" },
  { key: "sites", label: "Sites" },
];

export const DEFAULT_TAB: LiveOpsTab = "stats";

export const REFRESH_INTERVAL_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 15_000, label: "15s" },
  { value: 30_000, label: "30s" },
  { value: 60_000, label: "1 min" },
  { value: 300_000, label: "5 min" },
];

export const DEFAULT_REFRESH_MS = 30_000;

export const SESSION_STATUS_COLOR: Record<string, string> = {
  START: "processing",
  INTERIM: "cyan",
  STOP: "default",
};

export const TOKEN_STATUS_COLOR: Record<string, string> = {
  SOLD: "blue",
  ACTIVATED: "success",
  PAUSED: "warning",
  EXPIRED: "default",
  REVOKED: "error",
  CONSUMED: "default",
};

export const TOKEN_STATUS_LABEL: Record<string, string> = {
  SOLD: "Sold",
  ACTIVATED: "Activated",
  PAUSED: "Paused",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
  CONSUMED: "Consumed",
};
