import type { EligibilityStatus } from "./types";
import { ELIGIBILITY_LABEL } from "./constant";

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

export function formatCount(value: number): string {
  return value.toLocaleString();
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

export function formatEligibility(status: EligibilityStatus | string): string {
  return ELIGIBILITY_LABEL[status as EligibilityStatus] ?? status;
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

export function formatGapDays(days: number): string {
  if (days === 0) return "None";
  if (days === 1) return "1 day";
  return `${days.toLocaleString()} days`;
}

export function truncateHash(hash: string, length = 12): string {
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}…`;
}

export function sealedPct(sealedCount: number, scopeCount: number): number {
  if (scopeCount <= 0) return 0;
  return Math.round((sealedCount / scopeCount) * 1000) / 10;
}
