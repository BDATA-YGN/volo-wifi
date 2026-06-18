import type { PlanQuotaType, ServicePlanRecord, UnitTime } from "./types";
import { QUOTA_TYPE_OPTIONS, TIME_UNIT_OPTIONS } from "./constant";

export function formatQuotaLabel(plan: Pick<
  ServicePlanRecord,
  "quotaType" | "timeAmount" | "timeUnit" | "dataMb"
>): string {
  const parts: string[] = [];

  if (plan.quotaType === "TIME_ONLY" || plan.quotaType === "TIME_AND_DATA") {
    if (plan.timeAmount != null && plan.timeUnit) {
      const unit =
        TIME_UNIT_OPTIONS.find((o) => o.value === plan.timeUnit)?.label ??
        plan.timeUnit.toLowerCase();
      const singular = unit.replace(/s$/, "");
      parts.push(`${plan.timeAmount} ${plan.timeAmount === 1 ? singular : unit}`);
    }
  }

  if (plan.quotaType === "DATA_ONLY" || plan.quotaType === "TIME_AND_DATA") {
    if (plan.dataMb != null) {
      parts.push(plan.dataMb >= 1024 ? `${(plan.dataMb / 1024).toFixed(1)} GB` : `${plan.dataMb} MB`);
    }
  }

  return parts.length ? parts.join(" + ") : "—";
}

export function formatQuotaTypeLabel(quotaType: PlanQuotaType): string {
  return QUOTA_TYPE_OPTIONS.find((o) => o.value === quotaType)?.label ?? quotaType;
}

export function formatValidity(days: number | null): string {
  if (days == null) return "—";
  if (days === 1) return "1 day";
  return `${days} days`;
}
