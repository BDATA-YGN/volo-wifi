import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { RadiusAcctStatus } from "./types";

/** Console API paths — mirrors backend `/wifi/network/radius/live-sessions` */
export const NETWORK_RADIUS_LIVE_SESSIONS_API = buildWifiApiRoutes(
  "/wifi/network/radius/live-sessions"
);

export const STATUS_COLOR: Record<RadiusAcctStatus, string> = {
  START: "success",
  INTERIM: "processing",
  STOP: "default",
};

export const STATUS_LABEL: Record<RadiusAcctStatus, string> = {
  START: "Active",
  INTERIM: "Interim",
  STOP: "Stopped",
};

export const VIEW_OPTIONS = [
  { label: "Active", value: "active" as const },
  { label: "Recent (24h)", value: "recent" as const },
  { label: "All", value: "all" as const },
];

export const AUTO_REFRESH_MS = 30_000;
