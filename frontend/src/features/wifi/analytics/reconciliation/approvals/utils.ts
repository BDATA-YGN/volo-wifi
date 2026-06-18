import type { WorkflowStatus } from "./types";

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

export function formatDelta(delta: number | null): string {
  if (delta === null) return "new";
  if (delta === 0) return "0%";
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatStatusLabel(status: WorkflowStatus | string): string {
  const map: Record<string, string> = {
    DRAFT: "Draft",
    DECLARED: "Declared",
    STATION_ATTESTED: "Station attested",
    ORG_APPROVED: "Org approved",
    REJECTED: "Rejected",
    POSTED: "Posted",
  };
  return map[status] ?? status;
}

export function formatAttestationKind(kind: string): string {
  const map: Record<string, string> = {
    STATION: "Station attestation",
    ORGANIZATION: "Org approval",
  };
  return map[kind] ?? kind;
}

export function formatVariance(variance: number | null, currency: string): string {
  if (variance == null) return "—";
  if (Math.abs(variance) < 0.01) return "Matched";
  const sign = variance > 0 ? "+" : "";
  return `${sign}${formatMoney(variance, currency)}`;
}

export function truncateHash(hash: string, length = 12): string {
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}…`;
}
