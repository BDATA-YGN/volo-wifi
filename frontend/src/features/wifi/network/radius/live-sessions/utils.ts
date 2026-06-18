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
  status: RadiusAcctStatus
): string {
  let sec = sessionTimeSec ?? undefined;
  if (sec == null) {
    const start = new Date(startedAt).getTime();
    const end =
      stoppedAt != null
        ? new Date(stoppedAt).getTime()
        : status === "STOP"
          ? start
          : Date.now();
    sec = Math.max(0, Math.floor((end - start) / 1000));
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
