import type { InvoiceFilter } from "./types";

export const INVOICE_FILTER_OPTIONS: { value: InvoiceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
];

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ISSUED: "Unpaid",
  PARTIALLY_PAID: "Partial",
  PAID: "Paid",
  VOID: "Void",
};
