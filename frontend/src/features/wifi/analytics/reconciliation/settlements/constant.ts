import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PeriodPreset, SettlementStatus } from "./types";

/** Console API paths — mirrors backend `/wifi/analytics/reconciliation/settlements` */
export const ANALYTICS_RECONCILIATION_SETTLEMENTS_API = buildWifiApiRoutes(
  "/wifi/analytics/reconciliation/settlements"
);

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export const DEFAULT_PRESET: PeriodPreset = "30d";

export const STATUS_OPTIONS: { value: SettlementStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "DECLARED", label: "Declared" },
  { value: "STATION_ATTESTED", label: "Station attested" },
  { value: "ORG_APPROVED", label: "Org approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "POSTED", label: "Posted" },
];

export const STATUS_COLOR: Record<SettlementStatus, string> = {
  DRAFT: "default",
  DECLARED: "processing",
  STATION_ATTESTED: "cyan",
  ORG_APPROVED: "success",
  REJECTED: "error",
  POSTED: "purple",
};
