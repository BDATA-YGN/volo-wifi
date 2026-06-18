"use client";

import { useCallback, useState } from "react";
import { useRequest } from "ahooks";
import * as Query from "./query";
import type {
  InvoiceDetail,
  InvoiceOrgSummary,
  InvoicesMeta,
  InvoicesQueryParams,
  RecordPaymentFormValues,
  UpdateInvoiceFormValues,
} from "./types";

export function useBillingInvoices(selectedInvoiceId: string | null) {
  const [filters, setFilters] = useState<InvoicesQueryParams>({
    page: 1,
    limit: 20,
  });

  const orgsRequest = useRequest(() => Query.listInvoiceOrgs(), { refreshDeps: [] });

  const listRequest = useRequest(() => Query.listInvoices(filters), {
    refreshDeps: [filters.orgId, filters.status, filters.search, filters.page, filters.limit],
  });

  const detailRequest = useRequest(
    () => (selectedInvoiceId ? Query.loadInvoice(selectedInvoiceId) : Promise.resolve(null)),
    { refreshDeps: [selectedInvoiceId] }
  );

  const orgs = (orgsRequest.data?.data?.orgs ?? []) as InvoiceOrgSummary[];
  const invoices = listRequest.data?.data?.invoices ?? [];
  const listMeta = listRequest.data?.meta as InvoicesMeta | undefined;
  const detail = detailRequest.data?.data as InvoiceDetail | undefined;

  const refresh = useCallback(() => {
    orgsRequest.refresh();
    listRequest.refresh();
    if (selectedInvoiceId) detailRequest.refresh();
  }, [selectedInvoiceId, orgsRequest, listRequest, detailRequest]);

  const setOrgId = useCallback((orgId: string | null) => {
    setFilters((prev) => ({ ...prev, orgId: orgId || undefined, page: 1 }));
  }, []);

  const setStatus = useCallback((status: InvoicesQueryParams["status"] | null) => {
    setFilters((prev) => ({ ...prev, status: status || undefined, page: 1 }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  }, []);

  const setPagination = useCallback((page: number, limit?: number) => {
    setFilters((prev) => {
      if (limit !== undefined && limit !== prev.limit) {
        return { ...prev, page: 1, limit };
      }
      return { ...prev, page };
    });
  }, []);

  const recordPayment = useCallback(
    async (invoiceId: string, values: RecordPaymentFormValues) => {
      await Query.recordPayment(invoiceId, values);
      refresh();
    },
    [refresh]
  );

  const updateInvoice = useCallback(
    async (invoiceId: string, values: UpdateInvoiceFormValues) => {
      await Query.updateInvoice(invoiceId, values);
      refresh();
    },
    [refresh]
  );

  return {
    orgs,
    invoices,
    listMeta,
    detail,
    filters,
    loading:
      orgsRequest.loading ||
      listRequest.loading ||
      (Boolean(selectedInvoiceId) && detailRequest.loading),
    orgsLoading: orgsRequest.loading,
    listLoading: listRequest.loading,
    detailLoading: detailRequest.loading,
    error: orgsRequest.error || listRequest.error || detailRequest.error,
    refresh,
    setOrgId,
    setStatus,
    setSearch,
    setPagination,
    recordPayment,
    updateInvoice,
  };
}
