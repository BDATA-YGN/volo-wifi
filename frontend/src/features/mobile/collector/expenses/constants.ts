import type { MobileStatusMeta } from "@/features/mobile/shared/mobileStatusTones";
import type { SmsExpenseStatus } from "./interface";

export type ExpenseStatusFilter = SmsExpenseStatus | "all";

export const EXPENSE_STATUS_FILTERS: { value: ExpenseStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PAID", label: "Paid" },
];

export const EXPENSE_STATUS_META: Record<SmsExpenseStatus, MobileStatusMeta> = {
  DRAFT: { tone: "neutral", label: "Draft" },
  SUBMITTED: { tone: "info", label: "Submitted" },
  APPROVED: { tone: "success", label: "Approved" },
  REJECTED: { tone: "danger", label: "Rejected" },
  PAID: { tone: "highlight", label: "Paid" },
  VOID: { tone: "neutral", label: "Void" },
};
