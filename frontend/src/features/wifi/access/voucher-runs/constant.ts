import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";

/** Console API paths — mirrors backend `/wifi/access/voucher-runs` */
export const ACCESS_VOUCHER_RUNS_API = buildWifiApiRoutes("/wifi/access/voucher-runs");

export const BATCH_PREFIX_PATTERN = /^[A-Z0-9]{2,12}$/;
export const BATCH_NO_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,31}$/;

export const MAX_BATCH_QUANTITY = 10_000;
export const MIN_BATCH_QUANTITY = 1;

export const CREDENTIAL_STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "blue",
  NEW: "blue",
  SOLD: "cyan",
  ACTIVE: "green",
  ACTIVATED: "green",
  PAUSED: "gold",
  EXPIRED: "default",
  REVOKED: "red",
  CONSUMED: "purple",
};

export const CREDENTIAL_STATUS_BAR: Record<string, string> = {
  AVAILABLE: "#1677ff",
  NEW: "#1677ff",
  SOLD: "#13c2c2",
  ACTIVE: "#52c41a",
  ACTIVATED: "#52c41a",
  PAUSED: "#faad14",
  EXPIRED: "#8c8c8c",
  REVOKED: "#ff4d4f",
  CONSUMED: "#722ed1",
};

export const CREDENTIAL_STATUS_ORDER = [
  "AVAILABLE",
  "NEW",
  "SOLD",
  "ACTIVATED",
  "ACTIVE",
  "PAUSED",
  "CONSUMED",
  "EXPIRED",
  "REVOKED",
] as const;
