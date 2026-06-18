import dayjs from "dayjs";
import { formatCurrency, formatCurrencyCompact } from "@/common/utils/formatCurrency";
import { INVOICE_STATUS_LABEL } from "./constants";
import type { MobileInvoiceStatus } from "./types";

export function formatInvoiceAmount(
  amount: number | null | undefined,
  currency?: string,
  compact = false,
): string {
  return compact ? formatCurrencyCompact(amount, currency) : formatCurrency(amount, currency);
}

export function invoiceStatusLabel(status: MobileInvoiceStatus | string): string {
  return INVOICE_STATUS_LABEL[status] ?? status;
}

export function formatInvoicePeriod(periodStart: string, periodEnd: string): string {
  const start = dayjs(periodStart);
  const end = dayjs(periodEnd);
  if (!start.isValid() || !end.isValid()) return "—";
  if (start.isSame(end, "month") && start.isSame(end, "year")) {
    return `${start.format("D")}–${end.format("D MMM YYYY")}`;
  }
  return `${start.format("D MMM")} – ${end.format("D MMM YYYY")}`;
}

export function formatInvoiceDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("D MMM YYYY") : null;
}

export function isInvoiceOverdue(
  dueAt: string | null | undefined,
  status: MobileInvoiceStatus | string,
): boolean {
  if (!dueAt || status === "PAID" || status === "VOID") return false;
  return dayjs(dueAt).isBefore(dayjs(), "day");
}

export function invoiceStatusTone(status: MobileInvoiceStatus | string): string {
  switch (status) {
    case "PAID":
      return "statusPaid";
    case "PARTIALLY_PAID":
      return "statusPartial";
    case "ISSUED":
      return "statusUnpaid";
    case "VOID":
      return "statusVoid";
    default:
      return "statusDefault";
  }
}
