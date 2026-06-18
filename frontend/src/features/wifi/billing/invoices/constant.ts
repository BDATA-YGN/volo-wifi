import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";
import type { InvoiceStatus, PaymentMethod } from "./types";

export const BILLING_INVOICES_API = buildWifiApiRoutes("/wifi/billing/invoices");

export const INVOICE_STATUS_OPTIONS: { value: InvoiceStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "ISSUED", label: "Issued" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const INVOICE_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  ISSUED: "blue",
  PARTIALLY_PAID: "processing",
  PAID: "success",
  OVERDUE: "error",
  CANCELLED: "default",
};

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];

export const TIER_CODE_COLORS: Record<string, string> = {
  SMALL: "blue",
  MEDIUM: "cyan",
  LARGE: "purple",
  XL: "geekblue",
};
