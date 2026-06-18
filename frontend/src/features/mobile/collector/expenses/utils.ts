import type { ExpenseClaimRecord, SmsExpenseStatus } from "./interface";

export function summarizeExpenses(claims: ExpenseClaimRecord[]) {
  const sumByStatus = (status: SmsExpenseStatus) =>
    claims.filter((c) => c.status === status).reduce((sum, c) => sum + (c.totalAmount ?? 0), 0);

  return {
    total: claims.length,
    draftCount: claims.filter((c) => c.status === "DRAFT").length,
    draftAmount: sumByStatus("DRAFT"),
    submittedCount: claims.filter((c) => c.status === "SUBMITTED").length,
    submittedAmount: sumByStatus("SUBMITTED"),
    approvedCount: claims.filter((c) => c.status === "APPROVED").length,
    approvedAmount: sumByStatus("APPROVED"),
  };
}

export { formatMmk, expenseStatusLabel, canEditClaim, canSubmitClaim } from "./format-utils";
