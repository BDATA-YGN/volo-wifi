import type { MobilePaymentRecord } from "./types";

import { formatCurrencyCompact } from "@/common/utils/formatCurrency";

export {
  formatMmk,
  methodLabel,
  paymentStatusLabel,
} from "./format-utils";

export function formatMmkCompact(
  amount: number | null | undefined,
  currency?: string,
): string {
  return formatCurrencyCompact(amount, currency);
}

export function summarizePayments(payments: MobilePaymentRecord[]) {
  const sumAmount = (status?: string) =>
    payments
      .filter((p) => !status || p.status === status)
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return {
    total: payments.length,
    pendingCount: payments.filter((p) => p.status === "PENDING").length,
    pendingAmount: sumAmount("PENDING"),
    confirmedCount: payments.filter((p) => p.status === "CONFIRMED").length,
    confirmedAmount: sumAmount("CONFIRMED"),
  };
}

export function allocatedTotal(payment: MobilePaymentRecord): number {
  return payment.allocations.reduce((sum, a) => sum + a.amount, 0);
}
