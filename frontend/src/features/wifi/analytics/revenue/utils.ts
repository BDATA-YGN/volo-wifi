import type { TrendGranularity } from "./types";

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

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatDelta(delta: number | null): string {
  if (delta === null) return "new";
  if (delta === 0) return "0%";
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

export function formatTrendLabel(periodKey: string, granularity: TrendGranularity): string {
  if (granularity === "yearly") return periodKey;
  if (granularity === "monthly") {
    const [year, month] = periodKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  const date = new Date(periodKey);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function granularityLabel(granularity: TrendGranularity): string {
  if (granularity === "yearly") return "Yearly";
  if (granularity === "monthly") return "Monthly";
  return "Daily";
}
