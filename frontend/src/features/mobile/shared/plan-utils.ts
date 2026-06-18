const CADENCE_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMIANNUAL: "Semi-annual",
  ANNUAL: "Annual",
  CUSTOM: "Custom",
};

const INTERVAL_BY_CADENCE: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  ANNUAL: 12,
};

const STARLINK_TYPE_LABELS: Record<string, string> = {
  RESIDENTIAL: "Residential",
  ROAM: "Roam",
  MARITIME: "Maritime",
  BUSINESS: "Business",
};

export function cadenceLabel(cadence: string): string {
  return CADENCE_LABELS[cadence] ?? cadence.replace(/_/g, " ");
}

export function effectiveIntervalMonths(cadence: string, intervalMonths?: number): number {
  if (cadence === "CUSTOM") {
    return intervalMonths && intervalMonths > 0 ? intervalMonths : 1;
  }
  return INTERVAL_BY_CADENCE[cadence] ?? 1;
}

export function starlinkTypeLabel(type: string): string {
  return STARLINK_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}
