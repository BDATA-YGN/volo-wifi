import type { PriceBookRecord, PriceBookScope } from "./types";
import { SCOPE_OPTIONS } from "./constant";

export function formatScopeLabel(scope: PriceBookScope): string {
  return SCOPE_OPTIONS.find((o) => o.value === scope)?.label ?? scope;
}

export function formatBookScopeTarget(book: PriceBookRecord): string {
  if (book.scope === "RESELLER" && book.reseller) {
    return `${book.reseller.name} (${book.reseller.code})`;
  }
  if (book.scope === "STATION" && book.station) {
    return `${book.station.name} (${book.station.code})`;
  }
  return "All sites & partners";
}

export function formatMoney(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
