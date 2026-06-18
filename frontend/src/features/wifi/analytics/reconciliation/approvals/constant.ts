import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { PeriodPreset, WorkflowStatus } from "./types";

/** Console API paths — mirrors backend `/wifi/analytics/reconciliation/approvals` */
export const ANALYTICS_RECONCILIATION_APPROVALS_API = buildWifiApiRoutes(
  "/wifi/analytics/reconciliation/approvals"
);

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export const DEFAULT_PRESET: PeriodPreset = "30d";

export const STATUS_OPTIONS: { value: WorkflowStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "DECLARED", label: "Declared" },
  { value: "STATION_ATTESTED", label: "Station attested" },
  { value: "ORG_APPROVED", label: "Org approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "POSTED", label: "Posted" },
];

export const STATUS_COLOR: Record<WorkflowStatus, string> = {
  DRAFT: "default",
  DECLARED: "processing",
  STATION_ATTESTED: "cyan",
  ORG_APPROVED: "success",
  REJECTED: "error",
  POSTED: "purple",
};

export const ATTESTATION_KIND_LABEL: Record<string, string> = {
  STATION: "Station",
  ORGANIZATION: "Organization",
};

export const NEXT_ACTION_COLOR: Record<string, string> = {
  "Awaiting partner declaration": "default",
  "Awaiting station attestation": "processing",
  "Awaiting org approval": "cyan",
  "Ready to post": "success",
  Posted: "purple",
  Rejected: "error",
};
