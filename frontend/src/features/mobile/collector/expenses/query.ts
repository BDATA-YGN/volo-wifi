"use server";

import { collectorApiClient } from "@/lib/restapi/apiClient";
import { parseApiError } from "@/common/exceptions/handleApiError";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type {
  ExpenseAccountCode,
  ExpenseClaimRecord,
  ExpenseLineFormValue,
} from "./interface";
import type { ExpenseStatusFilter } from "./constants";

export interface ExpenseListResult {
  data: ExpenseClaimRecord[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalRows: number;
  };
}

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

export async function listCollectorExpenses(params?: {
  status?: ExpenseStatusFilter;
  page?: number;
  limit?: number;
}): Promise<ExpenseListResult> {
  const query: Record<string, string | number> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
  };
  if (params?.status && params.status !== "all") {
    query.status = params.status;
  }

  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.expenses, { params: query });
  return unwrapEnvelope<ExpenseListResult>(res);
}

export async function getCollectorExpense(id: string): Promise<ExpenseClaimRecord> {
  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.expenseDetail(id));
  return unwrapEnvelope<ExpenseClaimRecord>(res);
}

export async function listCollectorAccountCodes(): Promise<ExpenseAccountCode[]> {
  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.accountCodes);
  return unwrapEnvelope<ExpenseAccountCode[]>(res);
}

export async function createCollectorExpense(payload: {
  title?: string | null;
  note?: string | null;
  currency?: string;
}): Promise<ExpenseClaimRecord> {
  const res = await collectorApiClient.post(MOBILE_API_ROUTES.collector.expenses, payload);
  return unwrapEnvelope<ExpenseClaimRecord>(res);
}

export async function addCollectorExpenseLine(
  claimId: string,
  payload: ExpenseLineFormValue,
): Promise<void> {
  await collectorApiClient.post(MOBILE_API_ROUTES.collector.expenseLines(claimId), {
    ...payload,
    occurredAt: payload.occurredAt ?? null,
    receiptUrl: payload.receiptUrl ?? null,
    note: payload.note ?? null,
    title: payload.title ?? null,
  });
}

export async function submitCollectorExpense(claimId: string): Promise<ExpenseClaimRecord> {
  const res = await collectorApiClient.post(MOBILE_API_ROUTES.collector.expenseSubmit(claimId));
  return unwrapEnvelope<ExpenseClaimRecord>(res);
}

export type MobileExpenseActionResult = {
  success: boolean;
  error?: { message?: string };
};

export async function safeSubmitCollectorExpense(
  claimId: string,
): Promise<MobileExpenseActionResult & { data?: ExpenseClaimRecord }> {
  try {
    const data = await submitCollectorExpense(claimId);
    return { success: true, data };
  } catch (error) {
    const apiError = parseApiError(error);
    return { success: false, error: { message: apiError.message } };
  }
}

export async function safeCreateCollectorExpense(payload: {
  title?: string | null;
  note?: string | null;
  currency?: string;
}): Promise<MobileExpenseActionResult & { data?: ExpenseClaimRecord }> {
  try {
    const data = await createCollectorExpense(payload);
    return { success: true, data };
  } catch (error) {
    const apiError = parseApiError(error);
    return { success: false, error: { message: apiError.message } };
  }
}

export async function safeAddCollectorExpenseLine(
  claimId: string,
  payload: ExpenseLineFormValue,
): Promise<MobileExpenseActionResult> {
  try {
    await addCollectorExpenseLine(claimId, payload);
    return { success: true };
  } catch (error) {
    const apiError = parseApiError(error);
    return { success: false, error: { message: apiError.message } };
  }
}
