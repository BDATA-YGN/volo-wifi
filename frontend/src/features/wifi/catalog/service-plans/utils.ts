import type { PlanQuotaType, ServicePlanRecord, UnitTime } from "./types";
import { QUOTA_TYPE_OPTIONS, TIME_UNIT_OPTIONS } from "./constant";

function formatTimeLimit(amount: number, unit: UnitTime | null): string {
  if (amount <= 0) return "Unlimited time";
  if (!unit) return `${amount}`;
  const unitLabel =
    TIME_UNIT_OPTIONS.find((o) => o.value === unit)?.label ?? unit.toLowerCase();
  const singular = unitLabel.replace(/s$/, "");
  return `${amount} ${amount === 1 ? singular : unitLabel}`;
}

function formatDataLimit(mb: number): string {
  if (mb <= 0) return "Unlimited data";
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB` : `${mb} MB`;
}

export function formatQuotaLabel(
  plan: Pick<ServicePlanRecord, "quotaType" | "timeAmount" | "timeUnit" | "dataMb">
): string {
  const parts: string[] = [];

  // Prefer explicit amounts (0 = unlimited). Fall back to legacy quotaType when null.
  if (plan.timeAmount != null) {
    parts.push(formatTimeLimit(plan.timeAmount, plan.timeUnit));
  } else if (plan.quotaType === "TIME_ONLY" || plan.quotaType === "TIME_AND_DATA") {
    parts.push("Time");
  }

  if (plan.dataMb != null) {
    parts.push(formatDataLimit(plan.dataMb));
  } else if (plan.quotaType === "DATA_ONLY" || plan.quotaType === "TIME_AND_DATA") {
    parts.push("Data");
  }

  return parts.length ? parts.join(" · ") : "—";
}

export function formatQuotaTypeLabel(quotaType: PlanQuotaType): string {
  return QUOTA_TYPE_OPTIONS.find((o) => o.value === quotaType)?.label ?? quotaType;
}

export function formatValidity(days: number | null): string {
  if (days == null) return "—";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function planHasTimeLimit(
  plan: Pick<ServicePlanRecord, "timeAmount" | "quotaType">
): boolean {
  if (plan.timeAmount != null) return plan.timeAmount > 0;
  return plan.quotaType === "TIME_ONLY" || plan.quotaType === "TIME_AND_DATA";
}
