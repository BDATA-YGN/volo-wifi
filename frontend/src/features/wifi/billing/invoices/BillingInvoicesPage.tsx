"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import { useSearchParams } from "next/navigation";
import { Alert, App, Button, Card, theme } from "antd";
import { FileTextOutlined, ReloadOutlined } from "@ant-design/icons";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import { useBillingInvoices } from "./useBillingInvoices";
import type { InvoiceListRow, RecordPaymentFormValues } from "./types";
import InvoicesStats from "./components/InvoicesStats";
import InvoicesFilters from "./components/InvoicesFilters";
import InvoicesTable from "./components/InvoicesTable";
import InvoiceDetailDrawer from "./components/InvoiceDetailDrawer";
import RecordPaymentDrawer from "./components/RecordPaymentDrawer";



const BillingInvoicesPage: React.FC = () => {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const searchParams = useSearchParams();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    () => searchParams.get("invoiceId")
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const invoiceId = searchParams.get("invoiceId");
    if (invoiceId) {
      setSelectedInvoiceId(invoiceId);
      setDetailOpen(true);
    }
  }, [searchParams]);

  const {
    orgs,
    invoices,
    listMeta,
    detail,
    filters,
    listLoading,
    detailLoading,
    orgsLoading,
    error,
    refresh,
    setOrgId,
    setStatus,
    setSearch,
    setPagination,
    recordPayment,
  } = useBillingInvoices(selectedInvoiceId);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, setSearch]);

  const openInvoice = (invoice: InvoiceListRow) => {
    setSelectedInvoiceId(invoice.id);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedInvoiceId(null);
  };

  const handleRecordPayment = async (values: RecordPaymentFormValues) => {
    if (!selectedInvoiceId) return;
    setSaving(true);
    try {
      await recordPayment(selectedInvoiceId, values);
      message.success("Payment recorded");
      setPaymentOpen(false);
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Failed to record payment"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-0">
      <CommonHeader icon={FileTextOutlined} />

      <div
        style={{
          height: "var(--content-body-height)",
          overflowY: "auto",
          background: token.colorBgLayout,
          padding: 20,
        }}
      >
        {error ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Failed to load invoices"
            description={String(error)}
            action={
              <Button size="small" onClick={() => refresh()}>
                Retry
              </Button>
            }
          />
        ) : null}

        <div className="flex flex-col gap-4">
              <InvoicesStats meta={listMeta} loading={listLoading} />

              <Card
                size="small"
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <InvoicesFilters
                  orgs={orgs}
                  orgId={filters.orgId ?? null}
                  status={filters.status ?? null}
                  search={searchInput}
                  onOrgChange={setOrgId}
                  onStatusChange={setStatus}
                  onSearchChange={setSearchInput}
                />
              </Card>

              <Card
                title="Invoices"
                extra={
                  <Button icon={<ReloadOutlined />} onClick={() => refresh()} loading={listLoading}>
                    Refresh
                  </Button>
                }
                styles={{ body: { padding: 16 } }}
                style={{ borderRadius: token.borderRadiusLG }}
              >
                <InvoicesTable
                  data={invoices}
                  loading={listLoading}
                  selectedId={selectedInvoiceId}
                  page={filters.page ?? 1}
                  pageSize={filters.limit ?? 20}
                  total={listMeta?.total ?? 0}
                  onSelect={openInvoice}
                  onPaginationChange={setPagination}
                />
              </Card>
        </div>
      </div>

      <InvoiceDetailDrawer
        open={detailOpen}
        invoice={detail ?? null}
        loading={detailLoading}
        onClose={closeDetail}
        onRecordPayment={() => setPaymentOpen(true)}
      />

      <RecordPaymentDrawer
        open={paymentOpen}
        saving={saving}
        invoice={detail ?? null}
        onClose={() => !saving && setPaymentOpen(false)}
        onSubmit={handleRecordPayment}
      />
    </div>
  );
};

export default BillingInvoicesPage;
