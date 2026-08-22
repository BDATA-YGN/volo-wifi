import { STATUS_OPTIONS } from "./constant";
import type { SellablePlan } from "./types";

export function formatStatusLabel(status: string): string {
  const known = STATUS_OPTIONS.find((o) => o.value === status)?.label;
  if (known) return known;
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export function formatBytes(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = n;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size < 10 && i > 0 ? size.toFixed(1) : Math.round(size)} ${units[i]}`;
}

export function billedDurationSeconds(
  sessionTimeSec: number | null | undefined,
  startedAt: string,
  stoppedAt: string | null,
  status: string,
  createdAt?: string | null
): number {
  const startMs = new Date(startedAt).getTime();
  const createdMs = createdAt ? new Date(createdAt).getTime() : NaN;
  const start =
    Number.isFinite(createdMs) && createdMs > startMs ? createdMs : startMs;
  const end =
    stoppedAt != null
      ? new Date(stoppedAt).getTime()
      : status === "STOP"
        ? start
        : Date.now();
  const wall = Math.max(0, Math.floor((end - start) / 1000));
  const nas = sessionTimeSec ?? 0;
  if (sessionTimeSec == null) return wall;
  if (nas > wall + 120 && nas > wall * 2) return wall;
  return Math.max(nas, wall);
}

export function formatSessionDuration(
  sessionTimeSec: number | null | undefined,
  startedAt: string,
  stoppedAt: string | null,
  status: string,
  createdAt?: string | null
): string {
  let sec = billedDurationSeconds(sessionTimeSec, startedAt, stoppedAt, status, createdAt);

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function resolvePlanPrice(
  plans: SellablePlan[],
  planId: string,
  stationId: string | undefined
): number | null {
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return null;
  if (stationId && plan.pricesByStation?.[stationId] != null) {
    return plan.pricesByStation[stationId]!;
  }
  if (!plan.hasPricing || plan.unitPrice == null) return null;
  return plan.unitPrice;
}

export function calcLineTotal(
  unitPrice: number | null,
  quantity: number,
  discount: number
): number | null {
  if (unitPrice == null) return null;
  return Math.max(0, unitPrice * quantity - discount);
}
