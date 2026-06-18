import type { CommissionRuleFormValues, CommissionRuleRecord, CommissionType } from "./types";

export function formatCommissionValue(
  type: CommissionType,
  value: number,
  valuePercent: number | null,
  currency: string
): string {
  if (type === "PERCENT") {
    const pct = valuePercent ?? value * 100;
    return `${pct}%`;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toLocaleString()} ${currency}`;
  }
}

export function formValuesFromRecord(record: CommissionRuleRecord): CommissionRuleFormValues {
  return {
    resellerId: record.resellerId,
    planId: record.planId,
    type: record.type,
    percentValue: record.valuePercent ?? record.value * 100,
    fixedValue: record.type === "FIXED" ? record.value : 0,
    isActive: record.isActive,
  };
}

export function payloadFromForm(values: CommissionRuleFormValues) {
  return {
    resellerId: values.resellerId,
    planId: values.planId,
    type: values.type,
    value: values.type === "PERCENT" ? values.percentValue / 100 : values.fixedValue,
    isActive: values.isActive,
  };
}
