import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { StationStatus } from "./types";

/** Console API paths — mirrors backend `/wifi/sites` */
export const SITES_API = buildWifiApiRoutes("/wifi/sites");

export const SITE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,47}$/;

export const STATUS_OPTIONS: { value: StationStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "DISABLED", label: "Disabled" },
];

export const STATUS_COLOR: Record<StationStatus, string> = {
  ACTIVE: "success",
  MAINTENANCE: "warning",
  DISABLED: "default",
};

export const TIER_CODE_COLORS: Record<string, string> = {
  SMALL: "blue",
  MEDIUM: "cyan",
  LARGE: "purple",
  XL: "magenta",
};
