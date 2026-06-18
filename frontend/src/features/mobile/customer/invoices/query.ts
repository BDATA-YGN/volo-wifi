"use server";

import { customerApiClient } from "@/lib/restapi/apiClient";
import { MOBILE_API_ROUTES } from "@/features/mobile/shared/constants";
import type { InvoiceFilter, MobileInvoice } from "./types";

function unwrapEnvelope<T>(res: { data: unknown }): T {
  return (res.data as { data: T }).data;
}

export async function listCustomerInvoices(params?: {
  page?: number;
  limit?: number;
  filter?: InvoiceFilter;
}): Promise<{
  data: MobileInvoice[];
  meta: { currentPage: number; totalPages: number; totalRows: number };
}> {
  const res = await customerApiClient.get(MOBILE_API_ROUTES.customer.invoices, {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      filter: params?.filter ?? "all",
    },
  });
  return unwrapEnvelope<{
    data: MobileInvoice[];
    meta: { currentPage: number; totalPages: number; totalRows: number };
  }>(res);
}

export async function getCustomerInvoice(id: string): Promise<MobileInvoice> {
  const res = await customerApiClient.get(MOBILE_API_ROUTES.customer.invoiceDetail(id));
  return unwrapEnvelope<MobileInvoice>(res);
}
