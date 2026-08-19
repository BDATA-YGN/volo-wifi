import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { CoverageTab, EligibilityStatus } from "./types";

/** Console API paths — mirrors backend `/wifi/analytics/reconciliation/coverage` */
export const ANALYTICS_RECONCILIATION_COVERAGE_API = buildWifiApiRoutes(
  "/wifi/analytics/reconciliation/coverage"
);

export const COVERAGE_TABS: { key: CoverageTab; label: string }[] = [
  { key: "stats", label: "Stats" },
  { key: "sites", label: "Sites" },
  { key: "partners", label: "Partners" },
  { key: "ledger", label: "Ledger" },
];

export const DEFAULT_TAB: CoverageTab = "stats";

export const ELIGIBILITY_OPTIONS: { value: EligibilityStatus; label: string }[] = [
  { value: "SEALED", label: "Fully sealed" },
  { value: "GAP", label: "Coverage gap" },
  { value: "UNSEALED", label: "Unsealed posting" },
  { value: "NO_COVERAGE", label: "No coverage record" },
];

export const ELIGIBILITY_COLOR: Record<EligibilityStatus, string> = {
  SEALED: "success",
  GAP: "warning",
  UNSEALED: "processing",
  NO_COVERAGE: "error",
};

export const ELIGIBILITY_LABEL: Record<EligibilityStatus, string> = {
  SEALED: "Fully sealed",
  GAP: "Coverage gap",
  UNSEALED: "Unsealed posting",
  NO_COVERAGE: "No coverage record",
};

export const LAG_BUCKET_ELIGIBILITY: Record<string, EligibilityStatus> = {
  "Fully sealed": "SEALED",
  "1–7 day gap": "GAP",
  "8–30 day gap": "GAP",
  "31–90 day gap": "GAP",
  "90+ day gap": "GAP",
  "Unsealed posting": "UNSEALED",
  "No coverage record": "NO_COVERAGE",
};

export const LAG_BUCKET_COLOR: Record<string, string> = {
  "Fully sealed": "#52c41a",
  "1–7 day gap": "#faad14",
  "8–30 day gap": "#fa8c16",
  "31–90 day gap": "#d46b08",
  "90+ day gap": "#ad4e00",
  "Unsealed posting": "#1677ff",
  "No coverage record": "#ff4d4f",
};
