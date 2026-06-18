import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { AuthEventOutcome } from "./types";

/** Console API paths — mirrors backend `/wifi/network/radius/auth-events` */
export const NETWORK_RADIUS_AUTH_EVENTS_API = buildWifiApiRoutes(
  "/wifi/network/radius/auth-events"
);

export const OUTCOME_COLOR: Record<AuthEventOutcome, string> = {
  ACCEPT: "success",
  REJECT: "error",
  UNKNOWN: "default",
};

export const VIEW_OPTIONS = [
  { label: "Recent (24h)", value: "recent" as const },
  { label: "Today", value: "today" as const },
  { label: "All", value: "all" as const },
];

export const AUTO_REFRESH_MS = 30_000;
