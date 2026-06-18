import type { SettlementStatus } from "./types";

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

export function formatStatusLabel(status: SettlementStatus | string): string {
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

export function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    CASH: "Cash",
    BANK_TRANSFER: "Bank transfer",
    MOBILE_MONEY: "Mobile money",
    CARD: "Card",
    OTHER: "Other",
  };
  return map[method] ?? method;
}

export function varianceColor(variance: number | null): string | undefined {
  if (variance == null) return undefined;
  if (Math.abs(variance) < 0.01) return "#52c41a";
  if (variance > 0) return "#faad14";
  return "#ff4d4f";
}

export function formatVariance(variance: number | null, currency: string): string {
  if (variance == null) return "—";
  if (Math.abs(variance) < 0.01) return "Matched";
  const sign = variance > 0 ? "+" : "";
  return `${sign}${formatMoney(variance, currency)}`;
}
