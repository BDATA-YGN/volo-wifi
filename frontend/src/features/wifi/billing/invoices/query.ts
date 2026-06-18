"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonResponse } from "@/common/interface/interface";
import { BILLING_INVOICES_API } from "./constant";
import type {
  InvoiceDetail,
  InvoicesListPayload,
  InvoicesMeta,
  InvoicesOrgsPayload,
  InvoicesQueryParams,
  RecordPaymentFormValues,
  UpdateInvoiceFormValues,
} from "./types";

export const listInvoiceOrgs = async (): Promise<
  CommonResponse & { data: InvoicesOrgsPayload }
> => {
  try {
    const res = await apiClient.get(BILLING_INVOICES_API.listOrDetails(), {
      params: { summary: "orgs" },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const listInvoices = async (
  params: InvoicesQueryParams
): Promise<CommonResponse & { data: InvoicesListPayload; meta?: InvoicesMeta }> => {
  try {
    const res = await apiClient.get(BILLING_INVOICES_API.listOrDetails(), {
      params: {
        orgId: params.orgId || undefined,
        status: params.status || undefined,
        search: params.search || undefined,
        page: params.page,
        limit: params.limit,
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const loadInvoice = async (id: string): Promise<CommonResponse & { data: InvoiceDetail }> => {
  try {
    const res = await apiClient.get(BILLING_INVOICES_API.listOrDetails(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const recordPayment = async (
  invoiceId: string,
  payload: RecordPaymentFormValues
): Promise<CommonResponse & { data: InvoiceDetail }> => {
  try {
    const res = await apiClient.post(BILLING_INVOICES_API.createOrUpdate(invoiceId), payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateInvoice = async (
  invoiceId: string,
  payload: UpdateInvoiceFormValues
): Promise<CommonResponse & { data: InvoiceDetail }> => {
  try {
    const res = await apiClient.post(BILLING_INVOICES_API.createOrUpdate(invoiceId), payload);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
