import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { EligibilityStatus } from "./types";

/** Console API paths — mirrors backend `/wifi/analytics/reconciliation/coverage` */
export const ANALYTICS_RECONCILIATION_COVERAGE_API = buildWifiApiRoutes(
  "/wifi/analytics/reconciliation/coverage"
);

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
