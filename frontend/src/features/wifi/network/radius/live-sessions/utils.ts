import { formatFileSize } from "@/utils/utils";
import type { LiveSessionRecord, RadiusAcctStatus } from "./types";

export function parseByteString(value: string | null | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatBytes(value: string | null | undefined): string {
  const n = parseByteString(value);
  if (n === 0) return "—";
  return formatFileSize(n);
}

export function formatSessionDuration(
  sessionTimeSec: number | null | undefined,
  startedAt: string,
  stoppedAt: string | null,
  status: RadiusAcctStatus,
  lastInterimAt?: string | null,
  createdAt?: string | null
): string {
  const startMs = new Date(startedAt).getTime();
  const createdMs = createdAt ? new Date(createdAt).getTime() : NaN;
  const start =
    Number.isFinite(createdMs) && createdMs > startMs ? createdMs : startMs;
  const lastSeen = lastInterimAt ? new Date(lastInterimAt).getTime() : NaN;
  const stop = stoppedAt != null ? new Date(stoppedAt).getTime() : NaN;
  const end = Number.isFinite(lastSeen)
    ? lastSeen
    : Number.isFinite(stop)
      ? stop
      : status === "STOP"
        ? start
        : Date.now();
  const lastSeenSec = Math.max(0, Math.floor((end - start) / 1000));
  const nas = sessionTimeSec ?? 0;
  let sec = lastSeenSec;
  if (nas > 12 * 3600 && nas > lastSeenSec * 2) {
    sec = lastSeenSec;
  } else if (nas > 0) {
    sec = nas;
  }

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatMac(mac: string | null | undefined): string {
  if (!mac) return "—";
  const clean = mac.replace(/[^a-fA-F0-9]/g, "");
  if (clean.length !== 12) return mac;
  return clean.match(/.{1,2}/g)?.join(":").toUpperCase() ?? mac;
}

export function sessionDisplayName(row: LiveSessionRecord): string {
  return row.userName?.trim() || row.callingStationId?.trim() || row.acctSessionId;
}
