import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";

/** Console API paths — mirrors backend `/wifi/access/voucher-runs` */
export const ACCESS_VOUCHER_RUNS_API = buildWifiApiRoutes("/wifi/access/voucher-runs");

export const BATCH_PREFIX_PATTERN = /^[A-Z0-9]{2,12}$/;
export const BATCH_NO_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,31}$/;

export const MAX_BATCH_QUANTITY = 500;
export const MIN_BATCH_QUANTITY = 1;

export const CREDENTIAL_STATUS_COLOR: Record<string, string> = {
  NEW: "blue",
  SOLD: "cyan",
  ACTIVE: "green",
  ACTIVATED: "green",
  EXPIRED: "default",
  REVOKED: "red",
  CONSUMED: "purple",
};
