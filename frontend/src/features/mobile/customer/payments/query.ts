"use server";

import { customerApiClient } from "@/lib/restapi/apiClient";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type { MobileCustomerPayment, PaymentStatusFilter } from "./types";

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

export async function listCustomerPayments(params?: {
  page?: number;
  limit?: number;
  status?: PaymentStatusFilter;
}): Promise<{
  data: MobileCustomerPayment[];
  meta: { currentPage: number; totalPages: number; totalRows: number };
}> {
  const res = await customerApiClient.get(MOBILE_API_ROUTES.customer.payments, {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      status: params?.status ?? "all",
    },
  });
  return unwrapEnvelope<{
    data: MobileCustomerPayment[];
    meta: { currentPage: number; totalPages: number; totalRows: number };
  }>(res);
}
