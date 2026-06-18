import { useAppSettingStore } from "@/features/system/app-setting/store";

const FALLBACK_CURRENCY_CODE = "MMK";
const FALLBACK_CURRENCY_SUFFIX = "Ks";

/** ISO currency code for new records (invoices, payments, expenses). */
export function getDefaultCurrencyCode(): string {
  const s = useAppSettingStore.getState();
  return s.get("currency_code")?.trim() || FALLBACK_CURRENCY_CODE;
}

/** Display suffix for amounts (prefers `currency_symbol`; legacy MMK → Ks). */
export function getDefaultCurrencySuffix(): string {
  const s = useAppSettingStore.getState();
  const symbol = s.get("currency_symbol")?.trim();
  if (symbol && symbol !== FALLBACK_CURRENCY_CODE) return symbol;
  return FALLBACK_CURRENCY_SUFFIX;
}

export function resolveCurrencyCode(currency?: string | null): string {
  return currency?.trim() || getDefaultCurrencyCode();
}

/** Map stored ISO codes (e.g. MMK) to the configured display suffix (e.g. Ks). */
export function resolveCurrencyDisplay(currency?: string | null): string {
  const trimmed = currency?.trim();
  if (!trimmed) return getDefaultCurrencySuffix();
  if (trimmed === getDefaultCurrencyCode()) return getDefaultCurrencySuffix();
  return trimmed;
}

export function formatCurrency(
  amount: number | null | undefined,
  currency?: string,
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const suffix = resolveCurrencyDisplay(currency);
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);
  return `${formatted} ${suffix}`;
}

/** @deprecated Prefer `formatCurrency` — kept for existing imports. */
export const formatMmk = formatCurrency;

function compactUnitValue(value: number): string {
  if (value >= 100) return String(Math.round(value));
  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

/** Short display for large amounts, e.g. 2,000,000 → "2M MMK". Below 10,000 uses full format. */
export function formatCurrencyCompact(
  amount: number | null | undefined,
  currency?: string,
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const code = resolveCurrencyDisplay(currency);
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}${compactUnitValue(abs / 1_000_000_000)}B ${code}`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${compactUnitValue(abs / 1_000_000)}M ${code}`;
  }
  if (abs >= 10_000) {
    return `${sign}${compactUnitValue(abs / 1_000)}K ${code}`;
  }

  return formatCurrency(amount, currency);
}
