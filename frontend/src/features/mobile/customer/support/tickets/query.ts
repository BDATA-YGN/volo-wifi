"use server";

import { customerApiClient } from "@/lib/restapi/apiClient";
import { parseApiError } from "@/common/exceptions/handleApiError";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type {
  CreateCustomerSupportTicketPayload,
  CustomerSupportTicket,
  CustomerTicketStatusFilter,
} from "./types";

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

export async function listCustomerSupportTickets(params?: {
  status?: CustomerTicketStatusFilter;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: CustomerSupportTicket[];
  meta: { currentPage: number; totalPages: number; totalRows: number };
}> {
  const query: Record<string, string | number> = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    status: params?.status ?? "active",
  };
  if (params?.search?.trim()) {
    query.search = params.search.trim();
  }

  const res = await customerApiClient.get(MOBILE_API_ROUTES.customer.supportTickets, {
    params: query,
  });
  const body = res.data as {
    data: CustomerSupportTicket[];
    meta: { currentPage: number; totalPages: number; totalRows: number };
  };
  return { data: body.data ?? [], meta: body.meta };
}

export async function getCustomerSupportTicket(id: string): Promise<CustomerSupportTicket> {
  const res = await customerApiClient.get(MOBILE_API_ROUTES.customer.supportTicketDetail(id));
  return unwrapEnvelope<CustomerSupportTicket>(res);
}

export async function createCustomerSupportTicket(
  payload: CreateCustomerSupportTicketPayload,
): Promise<CustomerSupportTicket> {
  const res = await customerApiClient.post(MOBILE_API_ROUTES.customer.supportTickets, payload);
  return unwrapEnvelope<CustomerSupportTicket>(res);
}

export async function replyCustomerSupportTicket(
  id: string,
  body: string,
): Promise<CustomerSupportTicket> {
  const res = await customerApiClient.post(MOBILE_API_ROUTES.customer.supportTicketReply(id), {
    body,
  });
  return unwrapEnvelope<CustomerSupportTicket>(res);
}

export type CustomerTicketActionResult = {
  success: boolean;
  error?: { message?: string };
  data?: CustomerSupportTicket;
};

export async function safeCreateCustomerSupportTicket(
  payload: CreateCustomerSupportTicketPayload,
): Promise<CustomerTicketActionResult> {
  try {
    const data = await createCustomerSupportTicket(payload);
    return { success: true, data };
  } catch (error) {
    const apiError = parseApiError(error);
    return { success: false, error: { message: apiError.message } };
  }
}

export async function safeReplyCustomerSupportTicket(
  id: string,
  body: string,
): Promise<CustomerTicketActionResult> {
  try {
    const data = await replyCustomerSupportTicket(id, body);
    return { success: true, data };
  } catch (error) {
    const apiError = parseApiError(error);
    return { success: false, error: { message: apiError.message } };
  }
}
