export type SmsExpenseStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "PAID" | "VOID";

export type ExpenseAccountCode = {
  id: string;
  code: string;
  name: string;
  type: string;
};

export type ExpenseLineRecord = {
  id: string;
  title: string | null;
  amount: number;
  occurredAt: string | null;
  receiptUrl: string | null;
  note: string | null;
  accountCode?: ExpenseAccountCode | null;
};

export type ExpenseClaimRecord = {
  id: string;
  title: string | null;
  note: string | null;
  currency: string;
  status: SmsExpenseStatus;
  totalAmount: number;
  lineCount: number;
  createdAt: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  approvalNote?: string | null;
  lines?: ExpenseLineRecord[];
};

export type ExpenseLineFormValue = {
  accountCodeId: string;
  title?: string | null;
  amount: number;
  occurredAt?: string | null;
  receiptUrl?: string | null;
  note?: string | null;
};
