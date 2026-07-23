import type { PriceBookRecord, PriceBookScope } from "./types";
import { SCOPE_OPTIONS } from "./constant";

export function formatScopeLabel(scope: PriceBookScope): string {
  return SCOPE_OPTIONS.find((o) => o.value === scope)?.label ?? scope;
}

function formatEntityLabel(entity: { name: string; code: string }): string {
  return `${entity.name} (${entity.code})`;
}

export function formatBookScopeTarget(book: PriceBookRecord): string {
  if (book.scope === "RESELLER") {
    const list = book.resellers ?? [];
    if (list.length === 0) return "No partners linked";
    return list.map(formatEntityLabel).join(", ");
  }
  if (book.scope === "STATION") {
    const list = book.stations ?? [];
    if (list.length === 0) return "No sites linked";
    return list.map(formatEntityLabel).join(", ");
  }
  return "All sites & partners";
}

/** Short label for table cells; full string stays available for tooltips. */
export function formatBookScopeTargetShort(book: PriceBookRecord, maxItems = 2): string {
  if (book.scope === "RESELLER") {
    const list = book.resellers ?? [];
    if (list.length === 0) return "No partners linked";
    if (list.length <= maxItems) return list.map(formatEntityLabel).join(", ");
    const head = list.slice(0, maxItems).map(formatEntityLabel).join(", ");
    return `${head} +${list.length - maxItems} more`;
  }
  if (book.scope === "STATION") {
    const list = book.stations ?? [];
    if (list.length === 0) return "No sites linked";
    if (list.length <= maxItems) return list.map(formatEntityLabel).join(", ");
    const head = list.slice(0, maxItems).map(formatEntityLabel).join(", ");
    return `${head} +${list.length - maxItems} more`;
  }
  return "All sites & partners";
}

export function formatMoney(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
