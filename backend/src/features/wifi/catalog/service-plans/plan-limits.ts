import type { PlanQuotaType, UnitTime } from './constants';

/** True when the plan enforces a finite time allowance (amount > 0). */
export function planHasTimeLimit(fields: {
  timeAmount?: number | null;
  quotaType?: PlanQuotaType | string | null;
}): boolean {
  if (fields.timeAmount != null) return fields.timeAmount > 0;
  // Legacy rows: null amount meant "not applicable" for DATA_ONLY.
  return fields.quotaType === 'TIME_ONLY' || fields.quotaType === 'TIME_AND_DATA';
}

/** True when the plan enforces a finite data allowance (MB > 0). */
export function planHasDataLimit(fields: {
  dataMb?: number | null;
  quotaType?: PlanQuotaType | string | null;
}): boolean {
  if (fields.dataMb != null) return fields.dataMb > 0;
  return fields.quotaType === 'DATA_ONLY' || fields.quotaType === 'TIME_AND_DATA';
}

/**
 * Derive catalog quotaType from independent limits.
 * 0 = unlimited for that dimension.
 */
export function derivePlanQuotaType(timeAmount: number, dataMb: number): PlanQuotaType {
  const hasTime = timeAmount > 0;
  const hasData = dataMb > 0;
  if (hasTime && !hasData) return 'TIME_ONLY';
  if (!hasTime && hasData) return 'DATA_ONLY';
  return 'TIME_AND_DATA';
}

/** Normalize nullable legacy values to the 0=unlimited model. */
export function normalizePlanLimitAmount(value: number | null | undefined): number {
  if (value == null || value < 0) return 0;
  return value;
}

export function assertPlanLimitFields(fields: {
  timeAmount: number;
  timeUnit?: string | null;
  dataMb: number;
}): string | null {
  if (fields.timeAmount > 0 && !fields.timeUnit) {
    return 'Time unit is required when allow-time is greater than 0.';
  }
  return null;
}

export function resolveTimeUnitForWrite(
  timeAmount: number,
  timeUnit: string | null | undefined
): UnitTime | null {
  if (timeAmount <= 0) return null;
  return (timeUnit as UnitTime) ?? null;
}
