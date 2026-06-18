import { formatCurrency } from "@/common/utils/formatCurrency";
import type { SmsExpenseStatus } from "./interface";

const STATUS_LABELS: Record<SmsExpenseStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
  VOID: "Void",
};

export function formatMmk(amount: number | null | undefined, currency?: string): string {
  return formatCurrency(amount, currency);
}

export function expenseStatusLabel(status: string): string {
  return STATUS_LABELS[status as SmsExpenseStatus] ?? status;
}

export function canEditClaim(status: SmsExpenseStatus | string): boolean {
  return status === "DRAFT";
}

export function canSubmitClaim(status: SmsExpenseStatus | string): boolean {
  return status === "DRAFT";
}
