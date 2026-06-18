import dayjs from "dayjs";
import { formatCurrency, formatCurrencyCompact } from "@/common/utils/formatCurrency";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "./constants";
import type { MobileCustomerPayment } from "./types";

export function formatPaymentAmount(
  amount: number | null | undefined,
  currency?: string,
  compact = false,
): string {
  return compact ? formatCurrencyCompact(amount, currency) : formatCurrency(amount, currency);
}

export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABEL[status] ?? status;
}

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABEL[method] ?? method.replace(/_/g, " ");
}

export function formatPaymentDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("D MMM YYYY, HH:mm") : null;
}

export function paymentStatusTone(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "statusConfirmed";
    case "PENDING":
      return "statusPending";
    case "VOID":
      return "statusVoid";
    default:
      return "statusDefault";
  }
}

export function allocatedTotal(payment: MobileCustomerPayment): number {
  return payment.allocations.reduce((sum, row) => sum + (row.amount ?? 0), 0);
}

export function summarizePayments(payments: MobileCustomerPayment[]) {
  const sumAmount = (status?: string) =>
    payments
      .filter((p) => !status || p.status === status)
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return {
    total: payments.length,
    confirmedCount: payments.filter((p) => p.status === "CONFIRMED").length,
    confirmedAmount: sumAmount("CONFIRMED"),
    pendingCount: payments.filter((p) => p.status === "PENDING").length,
    pendingAmount: sumAmount("PENDING"),
  };
}
