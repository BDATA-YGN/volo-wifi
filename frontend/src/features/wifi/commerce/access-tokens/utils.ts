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

export function accountingStartAt(
  startedAt: string,
  createdAt?: string | null
): string {
  const startMs = new Date(startedAt).getTime();
  const createdMs = createdAt ? new Date(createdAt).getTime() : NaN;
  if (Number.isFinite(createdMs) && createdMs > startMs) {
    return new Date(createdMs).toISOString();
  }
  return startedAt;
}

export function lastSeenDurationSeconds(
  startedAt: string,
  stoppedAt: string | null,
  status: string,
  createdAt?: string | null,
  lastInterimAt?: string | null
): number {
  const start = new Date(accountingStartAt(startedAt, createdAt)).getTime();
  const lastSeenMs = lastInterimAt ? new Date(lastInterimAt).getTime() : NaN;
  const stopMs = stoppedAt != null ? new Date(stoppedAt).getTime() : NaN;
  const end = Number.isFinite(lastSeenMs)
    ? lastSeenMs
    : Number.isFinite(stopMs)
      ? stopMs
      : status === "STOP"
        ? start
        : Date.now();
  return Math.max(0, Math.floor((end - start) / 1000));
}

const LEFTOVER_HOST_SESSION_SEC = 24 * 3600;
const GHOST_SESSION_WALL_SEC = 120;
const GHOST_NAS_MIN_SEC = 60;

function isGhostSessionTimeoutCopy(nas: number, lastSeen: number): boolean {
  return lastSeen < GHOST_SESSION_WALL_SEC && nas > GHOST_NAS_MIN_SEC && nas > lastSeen * 2;
}

export function billedDurationSeconds(
  sessionTimeSec: number | null | undefined,
  startedAt: string,
  stoppedAt: string | null,
  status: string,
  createdAt?: string | null,
  lastInterimAt?: string | null
): number {
  const lastSeen = lastSeenDurationSeconds(
    startedAt,
    stoppedAt,
    status,
    createdAt,
    lastInterimAt
  );
  const nas = sessionTimeSec ?? 0;
  if (lastSeen > LEFTOVER_HOST_SESSION_SEC && nas > LEFTOVER_HOST_SESSION_SEC) return 0;
  if (nas > LEFTOVER_HOST_SESSION_SEC) return lastSeen;
  if (lastSeen > LEFTOVER_HOST_SESSION_SEC) {
    return nas > 0 && nas <= LEFTOVER_HOST_SESSION_SEC ? nas : 0;
  }
  if (isGhostSessionTimeoutCopy(nas, lastSeen)) return lastSeen;
  if (nas > 12 * 3600 && nas > lastSeen * 2) return lastSeen;
  if (nas > 0) return Math.min(nas, lastSeen);
  return lastSeen;
}

export function formatClockSeconds(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatSessionDuration(
  sessionTimeSec: number | null | undefined,
  startedAt: string,
  stoppedAt: string | null,
  status: string,
  createdAt?: string | null,
  lastInterimAt?: string | null
): string {
  let sec = lastSeenDurationSeconds(
    startedAt,
    stoppedAt,
    status,
    createdAt,
    lastInterimAt
  );
  const nas = sessionTimeSec ?? 0;
  if (sec === 0 && nas > 0 && nas <= LEFTOVER_HOST_SESSION_SEC && !isGhostSessionTimeoutCopy(nas, sec)) {
    sec = nas;
  }
  return formatClockSeconds(sec);
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
