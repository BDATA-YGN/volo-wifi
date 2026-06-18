"use server";

import { collectorApiClient } from "@/lib/restapi/apiClient";
import { parseApiError } from "@/common/exceptions/handleApiError";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type {
  MobileInvoiceAssignment,
  MobilePaymentRecord,
  OutstandingInvoiceRow,
  PaymentLicenseSummary,
  PaymentStatusFilter,
  RecordPaymentPayload,
} from "./types";

export interface PaymentListResult {
  data: MobilePaymentRecord[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalRows: number;
  };
}

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

function unwrapWithMeta<T>(res: { data: unknown }): { data: T; meta?: Record<string, unknown> } {
  const body = res.data as { data: T; meta?: Record<string, unknown> };
  return { data: body.data, meta: body.meta };
}

export async function listCollectorPayments(params?: {
  status?: PaymentStatusFilter;
  page?: number;
  limit?: number;
}): Promise<PaymentListResult> {
  const query: Record<string, string | number> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
  };
  if (params?.status && params.status !== "all") {
    query.status = params.status;
  }

  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.payments, { params: query });
  return unwrapEnvelope<PaymentListResult>(res);
}

export async function listCollectorInvoiceAssignments(params?: {
  search?: string;
  status?: "open" | "all";
  licenseId?: string;
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
  if (params?.licenseId) {
    query.licenseId = params.licenseId;
  }

  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.invoiceAssignments, { params: query });
  return unwrapEnvelope<{
    data: MobileInvoiceAssignment[];
    meta: { currentPage: number; totalPages: number; totalRows: number };
  }>(res);
}

export async function listCollectorPaymentLicenses(): Promise<PaymentLicenseSummary[]> {
  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.paymentLicenses);
  return unwrapEnvelope<PaymentLicenseSummary[]>(res);
}

export async function scanCollectorPaymentLicense(
  token: string,
): Promise<PaymentLicenseSummary> {
  const res = await collectorApiClient.post(MOBILE_API_ROUTES.collector.paymentLicenseScan, { token });
  return unwrapEnvelope<PaymentLicenseSummary>(res);
}

export type ScanLicenseActionResult = {
  success: boolean;
  error?: { message?: string };
  data?: PaymentLicenseSummary;
};

export async function safeScanCollectorPaymentLicense(
  token: string,
): Promise<ScanLicenseActionResult> {
  try {
    const data = await scanCollectorPaymentLicense(token);
    return { success: true, data };
  } catch (error) {
    const apiError = parseApiError(error);
    return { success: false, error: { message: apiError.message } };
  }
}

export async function listCollectorLicenseInvoices(
  licenseId: string,
): Promise<{ rows: OutstandingInvoiceRow[]; pendingHeldCount: number }> {
  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.paymentLicenseInvoices(licenseId));
  const { data, meta } = unwrapWithMeta<OutstandingInvoiceRow[]>(res);
  return {
    rows: data,
    pendingHeldCount: Number(meta?.pendingHeldCount ?? 0),
  };
}

export async function createCollectorPayment(
  payload: RecordPaymentPayload,
): Promise<MobilePaymentRecord> {
  const res = await collectorApiClient.post(MOBILE_API_ROUTES.collector.payments, {
    ...payload,
    currency: payload.currency,
    paidAt: payload.paidAt ?? new Date().toISOString(),
    referenceNo: payload.referenceNo ?? null,
    note: payload.note ?? null,
  });
  return unwrapEnvelope<MobilePaymentRecord>(res);
}

export type MobilePaymentActionResult = {
  success: boolean;
  error?: { message?: string };
  data?: MobilePaymentRecord;
};

export async function safeCreateCollectorPayment(
  payload: RecordPaymentPayload,
): Promise<MobilePaymentActionResult> {
  try {
    const data = await createCollectorPayment(payload);
    return { success: true, data };
  } catch (error) {
    const apiError = parseApiError(error);
    return { success: false, error: { message: apiError.message } };
  }
}
