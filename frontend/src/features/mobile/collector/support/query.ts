"use server";

import { collectorApiClient } from "@/lib/restapi/apiClient";
import { parseApiError } from "@/common/exceptions/handleApiError";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type {
  CreateSupportTicketPayload,
  SupportCustomerSearchRow,
  SupportTicketRecord,
  SupportTicketScopeFilter,
  SupportTicketStatusFilter,
  SupportTicketStatusValue,
} from "./types";

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

export async function listCollectorSupportTickets(params?: {
  scope?: SupportTicketScopeFilter;
  status?: SupportTicketStatusFilter;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: SupportTicketRecord[];
  meta: { currentPage: number; totalPages: number; totalRows: number };
}> {
  const query: Record<string, string | number> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    scope: params?.scope ?? "mine",
    status: params?.status ?? "active",
  };
  if (params?.search?.trim()) {
    query.search = params.search.trim();
  }

  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.supportTickets, { params: query });
  const body = res.data as {
    data: SupportTicketRecord[];
    meta: { currentPage: number; totalPages: number; totalRows: number };
  };
  return { data: body.data ?? [], meta: body.meta };
}

export async function getCollectorSupportTicket(id: string): Promise<SupportTicketRecord> {
  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.supportTicketDetail(id));
  return unwrapEnvelope<SupportTicketRecord>(res);
}

export async function searchSupportCustomers(search: string): Promise<SupportCustomerSearchRow[]> {
  const res = await collectorApiClient.get(MOBILE_API_ROUTES.collector.supportCustomers, {
    params: { search: search.trim(), limit: 20 },
  });
  return unwrapEnvelope<SupportCustomerSearchRow[]>(res);
}

export async function createCollectorSupportTicket(
  payload: CreateSupportTicketPayload,
): Promise<SupportTicketRecord> {
  const res = await collectorApiClient.post(MOBILE_API_ROUTES.collector.supportTickets, payload);
  return unwrapEnvelope<SupportTicketRecord>(res);
}

export async function assignSelfSupportTicket(id: string): Promise<SupportTicketRecord> {
  const res = await collectorApiClient.post(MOBILE_API_ROUTES.collector.supportTicketAssignSelf(id));
  return unwrapEnvelope<SupportTicketRecord>(res);
}

export async function replySupportTicket(
  id: string,
  payload: { body: string; status?: SupportTicketStatusValue },
): Promise<SupportTicketRecord> {
  const res = await collectorApiClient.post(MOBILE_API_ROUTES.collector.supportTicketReply(id), payload);
  return unwrapEnvelope<SupportTicketRecord>(res);
}

export async function setSupportTicketStatus(
  id: string,
  status: SupportTicketStatusValue,
): Promise<SupportTicketRecord> {
  const res = await collectorApiClient.post(MOBILE_API_ROUTES.collector.supportTicketStatus(id), { status });
  return unwrapEnvelope<SupportTicketRecord>(res);
}

export type SupportActionResult = {
  success: boolean;
  error?: { message?: string };
  data?: SupportTicketRecord;
};

export async function safeCreateCollectorSupportTicket(
  payload: CreateSupportTicketPayload,
): Promise<SupportActionResult> {
  try {
    const data = await createCollectorSupportTicket(payload);
    return { success: true, data };
  } catch (error) {
    const apiError = parseApiError(error);
    return { success: false, error: { message: apiError.message } };
  }
}

export async function safeReplySupportTicket(
  id: string,
  payload: { body: string; status?: SupportTicketStatusValue },
): Promise<SupportActionResult> {
  try {
    const data = await replySupportTicket(id, payload);
    return { success: true, data };
  } catch (error) {
    const apiError = parseApiError(error);
    return { success: false, error: { message: apiError.message } };
  }
}
