"use server";

import { collectorApiClient } from "@/lib/restapi/apiClient";
import { parseApiError } from "@/common/exceptions/handleApiError";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type { MobileInvoiceAssignment } from "../payments/types";

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

export type AssignmentStatusFilter = "open" | "all";

export async function listCollectorAssignments(params?: {
  search?: string;
  status?: AssignmentStatusFilter;
  page?: number;
  limit?: number;
}): Promise<{
  data: MobileInvoiceAssignment[];
  meta: { currentPage: number; totalPages: number; totalRows: number };
}> {
  const query: Record<string, string | number> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    status: params?.status ?? "open",
  };
  if (params?.search?.trim()) {
    query.search = params.search.trim();
  }

  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.invoiceAssignments, { params: query });
  return unwrapEnvelope<{
    data: MobileInvoiceAssignment[];
    meta: { currentPage: number; totalPages: number; totalRows: number };
  }>(res);
}

export async function acceptCollectorAssignment(id: string): Promise<MobileInvoiceAssignment> {
  const res = await collectorApiClient.post(MOBILE_API_ROUTES.collector.acceptInvoiceAssignment(id));
  const body = res.data as { data: MobileInvoiceAssignment };
  return body.data;
}

export type AssignmentActionResult = {
  success: boolean;
  error?: { message?: string };
  data?: MobileInvoiceAssignment;
};

export async function safeAcceptCollectorAssignment(id: string): Promise<AssignmentActionResult> {
  try {
    const data = await acceptCollectorAssignment(id);
    return { success: true, data };
  } catch (error) {
    const apiError = parseApiError(error);
    return { success: false, error: { message: apiError.message } };
  }
}
