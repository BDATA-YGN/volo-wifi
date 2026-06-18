import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { ActivityLogView } from "./types";

/** Console API paths — mirrors backend `/wifi/tenant/activity-log` */
export const TENANT_ACTIVITY_LOG_API = buildWifiApiRoutes("/wifi/tenant/activity-log");

export const VIEW_OPTIONS: { label: string; value: ActivityLogView }[] = [
  { label: "Last 24h", value: "recent" },
  { label: "Today", value: "today" },
  { label: "All time", value: "all" },
];

export const ACTION_COLOR: Record<string, string> = {
  TENANT_REGISTERED: "green",
  MEMBER_CREATED: "blue",
  MEMBER_LINKED: "cyan",
  MEMBER_UPDATED: "geekblue",
  MEMBER_REMOVED: "orange",
  ORG_PROFILE_UPDATED: "purple",
  LICENSE_UPDATED: "gold",
  STATION_CREATED: "lime",
  STATION_UPDATED: "volcano",
  PLAN_CREATED: "magenta",
  PLAN_UPDATED: "purple",
};

export const DEFAULT_ACTION_COLOR = "default";
