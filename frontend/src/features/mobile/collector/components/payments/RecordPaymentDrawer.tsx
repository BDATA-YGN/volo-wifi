"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Spin,
} from "antd";
import { QrcodeOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { getDefaultCurrencyCode } from "@/common/utils/formatCurrency";
import type { SmsPaymentMethod } from "../../payments/interface";
import { useAppSettingStore } from "@/features/system/app-setting/store";
import { PAYMENT_METHOD_OPTIONS } from "../../payments/constants";
import {
  listCollectorLicenseInvoices,
  listCollectorPaymentLicenses,
  safeCreateCollectorPayment,
  safeScanCollectorPaymentLicense,
} from "../../payments/query";
import type { MobileInvoiceAssignment, OutstandingInvoiceRow, PaymentLicenseSummary } from "../../payments/types";
import { formatMmk } from "../../payments/utils";
import AssignedInvoiceSearch from "../shared/AssignedInvoiceSearch";
import LicenseCertificateScanner from "./LicenseCertificateScanner";
import {
  MobileDrawerBody,
  mobileDrawerStyleProps,
  useMobileDrawerChrome,
} from "@/features/mobile/shared/components/MobileDrawerChrome";
import styles from "./payments.module.css";

interface PaymentFormValues {
  licenseId: string;
  amount: number;
  method: SmsPaymentMethod;
  paidAt?: Dayjs;
  referenceNo?: string;
  note?: string;
}

type AllocationRow = {
  invoiceId: string;
  invoiceNo: string;
  available: number;
  amount: number;
};

interface RecordPaymentDrawerProps {
  open: boolean;
  onClose: () => void;
  onRecorded: () => void;
}

function mergeLicense(
  list: PaymentLicenseSummary[],
  license: PaymentLicenseSummary,
): PaymentLicenseSummary[] {
  if (list.some((row) => row.id === license.id)) return list;
  return [license, ...list];
}

export default function RecordPaymentDrawer({
  open,
  onClose,
  onRecorded,
}: RecordPaymentDrawerProps) {
  const { message } = App.useApp();
  const { colorScheme } = useMobileDrawerChrome("collector");
  const [form] = Form.useForm<PaymentFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [resolvingScan, setResolvingScan] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [licenses, setLicenses] = useState<PaymentLicenseSummary[]>([]);
  const [selectedLicense, setSelectedLicense] = useState<PaymentLicenseSummary | null>(null);
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoices, setInvoices] = useState<OutstandingInvoiceRow[]>([]);
  const [pendingHeldCount, setPendingHeldCount] = useState(0);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const prefillInvoiceIdRef = useRef<string | null>(null);

  const licenseId = Form.useWatch("licenseId", form);
  const amount = Form.useWatch("amount", form) ?? 0;

  const licenseOptions = useMemo(
    () =>
      licenses.map((l) => ({
        value: l.id,
        label: `${l.licenseCode} — ${l.customer?.fullName ?? "Customer"}`,
      })),
    [licenses],
  );

  const allocatedSum = useMemo(
    () => allocations.reduce((sum, row) => sum + (row.amount || 0), 0),
    [allocations],
  );

  const activeAllocations = allocations.filter((a) => a.amount > 0);
  const canSubmit =
    Boolean(licenseId) &&
    amount > 0 &&
    activeAllocations.length > 0 &&
    allocatedSum <= amount &&
    allocatedSum > 0;

  const applyLicense = useCallback(
    (license: PaymentLicenseSummary) => {
      setSelectedLicense(license);
      setLicenses((prev) => mergeLicense(prev, license));
      form.setFieldValue("licenseId", license.id);
    },
    [form],
  );

  const handleAssignedInvoiceSelect = useCallback(
    (assignment: MobileInvoiceAssignment) => {
      const invoice = assignment.invoice;
      const license = invoice?.license;
      if (!invoice || !license) return;

      applyLicense(license);
      prefillInvoiceIdRef.current = invoice.id;
      if (invoice.available > 0) {
        form.setFieldValue("amount", invoice.available);
      }
    },
    [applyLicense, form],
  );

  const handleCertificateScan = useCallback(
    async (raw: string) => {
      setResolvingScan(true);
      try {
        const result = await safeScanCollectorPaymentLicense(raw);
        if (!result.success || !result.data) {
          throw new Error(result.error?.message ?? "Invalid certificate");
        }
        applyLicense(result.data);
        message.success(`License ${result.data.licenseCode} verified`);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Could not verify certificate");
      } finally {
        setResolvingScan(false);
      }
    },
    [applyLicense, message],
  );

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ method: "CASH", paidAt: dayjs(), amount: 0 });
    setSelectedLicense(null);
    setInvoices([]);
    setAllocations([]);
    setPendingHeldCount(0);
    prefillInvoiceIdRef.current = null;

    setLoadingLicenses(true);
    void listCollectorPaymentLicenses()
      .then(setLicenses)
      .catch(() => message.error("Could not load recent licenses"))
      .finally(() => setLoadingLicenses(false));
  }, [open, form, message]);

  useEffect(() => {
    if (!licenseId) {
      setSelectedLicense(null);
    } else {
      const match = licenses.find((l) => l.id === licenseId);
      if (match) setSelectedLicense(match);
    }
  }, [licenseId, licenses]);

  useEffect(() => {
    if (!open || !licenseId) {
      setInvoices([]);
      setAllocations([]);
      return;
    }

    setLoadingInvoices(true);
    void listCollectorLicenseInvoices(licenseId)
      .then(({ rows, pendingHeldCount: held }) => {
        setInvoices(rows);
        setPendingHeldCount(held);
        const prefillId = prefillInvoiceIdRef.current;
        setAllocations(
          rows.map((inv) => ({
            invoiceId: inv.id,
            invoiceNo: inv.invoiceNo,
            available: inv.available,
            amount: prefillId === inv.id ? inv.available : 0,
          })),
        );
        if (prefillId) {
          const match = rows.find((row) => row.id === prefillId);
          if (match && match.available > 0) {
            form.setFieldValue("amount", match.available);
          }
          prefillInvoiceIdRef.current = null;
        }
      })
      .catch(() => message.error("Could not load invoices for this license"))
      .finally(() => setLoadingInvoices(false));
  }, [open, licenseId, message, form]);

  const handleClose = () => {
    form.resetFields();
    setSelectedLicense(null);
    setAllocations([]);
    onClose();
  };

  const setAllocationAmount = (invoiceId: string, value: number) => {
    setAllocations((prev) =>
      prev.map((row) =>
        row.invoiceId === invoiceId
          ? { ...row, amount: Math.min(Math.max(0, value), row.available) }
          : row,
      ),
    );
  };

  const fillAllocation = (invoiceId: string) => {
    setAllocations((prev) =>
      prev.map((row) => {
        if (row.invoiceId !== invoiceId) return row;
        const remaining = Math.max(0, amount - allocatedSum + row.amount);
        const next = Math.min(row.available, remaining || row.available);
        return { ...row, amount: next };
      }),
    );
  };

  const requireFinanceConfirm = useAppSettingStore((s) =>
    s.getBool("sms_payments_require_finance_confirm"),
  );
  const defaultCurrency = getDefaultCurrencyCode();

  const onFinish = async (values: PaymentFormValues) => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const result = await safeCreateCollectorPayment({
        licenseId: values.licenseId,
        amount: Math.floor(values.amount),
        method: values.method,
        currency: defaultCurrency,
        paidAt: values.paidAt?.toISOString() ?? new Date().toISOString(),
        referenceNo: values.referenceNo?.trim() || null,
        note: values.note?.trim() || null,
        allocations: activeAllocations.map((a) => ({
          invoiceId: a.invoiceId,
          amount: Math.floor(a.amount),
        })),
      });

      if (!result.success) {
        throw new Error(result.error?.message ?? "Failed to record payment");
      }

      message.success(
        requireFinanceConfirm
          ? "Payment recorded — pending finance confirmation"
          : "Payment recorded and confirmed",
      );
      handleClose();
      onRecorded();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Drawer
        title="Record payment"
        placement="bottom"
        size="auto"
        open={open}
        onClose={handleClose}
        destroyOnHidden
        styles={mobileDrawerStyleProps(colorScheme, {
          body: {
            paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0))",
            maxHeight: "90vh",
            overflowY: "auto",
          },
        })}
      >
        <MobileDrawerBody actor="collector">
        <div className={styles.drawerHint}>
          Payment is saved as <strong>PENDING</strong> until finance confirms it. Search an assigned
          invoice, scan the certificate QR, or pick a license, then allocate to outstanding invoices.
        </div>

        <AssignedInvoiceSearch onSelect={handleAssignedInvoiceSelect} disabled={resolvingScan} />

        <div className={styles.scanSection}>
          <button
            type="button"
            className={styles.scanBtn}
            onClick={() => setScannerOpen(true)}
            disabled={resolvingScan}
          >
            <QrcodeOutlined />
            {resolvingScan ? "Verifying certificate…" : "Scan certificate QR"}
          </button>
        </div>

        {selectedLicense ? (
          <div className={styles.selectedLicenseCard}>
            <p className={styles.selectedLicenseCode}>{selectedLicense.licenseCode}</p>
            <p className={styles.selectedLicenseMeta}>
              {selectedLicense.customer?.fullName ?? "Customer"}
              {selectedLicense.customer?.township
                ? ` · ${selectedLicense.customer.township}`
                : null}
            </p>
          </div>
        ) : null}

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
          <Form.Item name="licenseId" hidden rules={[{ required: true, message: "Select a license" }]}>
            <Input />
          </Form.Item>

          {licenseOptions.length > 0 ? (
            <div style={{ marginBottom: "1rem" }}>
              <div className={styles.recentLicenseLabel}>Recent collection licenses</div>
              <Select
                showSearch
                allowClear
                size="large"
                placeholder="Or choose a recent collection license"
                options={licenseOptions}
                loading={loadingLicenses}
                optionFilterProp="label"
                value={licenseId || undefined}
                onChange={(value) => {
                  if (!value) {
                    setSelectedLicense(null);
                    form.setFieldValue("licenseId", undefined);
                    return;
                  }
                  const match = licenses.find((l) => l.id === value);
                  if (match) applyLicense(match);
                }}
              />
            </div>
          ) : null}

          <Form.Item
            label={`Amount collected (${defaultCurrency})`}
            name="amount"
            rules={[
              { required: true, message: "Enter amount" },
              { type: "number", min: 1, message: "Amount must be at least 1" },
            ]}
          >
            <InputNumber
              size="large"
              style={{ width: "100%" }}
              min={1}
              step={1000}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(v) => Number(String(v ?? "").replace(/,/g, "")) as unknown as 1}
            />
          </Form.Item>

          <Form.Item label="Method" name="method" rules={[{ required: true }]}>
            <Select size="large" options={PAYMENT_METHOD_OPTIONS} />
          </Form.Item>

          <Form.Item label="Paid at" name="paidAt">
            <DatePicker
              showTime
              size="large"
              style={{ width: "100%" }}
              format="D MMM YYYY, HH:mm"
            />
          </Form.Item>

          <Form.Item label="Reference no." name="referenceNo">
            <Input size="large" maxLength={120} placeholder="Transfer ref, receipt no." />
          </Form.Item>

          <Form.Item label="Note" name="note">
            <Input.TextArea rows={2} maxLength={2000} placeholder="Collector note" />
          </Form.Item>

          {loadingInvoices ? (
            <div className={styles.loadingWrap}>
              <Spin size="small" />
              <span>Loading invoices…</span>
            </div>
          ) : licenseId && invoices.length === 0 ? (
            <div className={styles.warningBanner}>
              No collectible invoices for this license.
              {pendingHeldCount > 0
                ? ` ${pendingHeldCount} invoice(s) have balance held by other pending payments.`
                : null}
            </div>
          ) : null}

          {allocations.length > 0 ? (
            <div className={styles.allocSection}>
              <div className={styles.allocSectionTitle}>Allocate to invoices</div>
              {allocations.map((row) => (
                <div key={row.invoiceId} className={styles.allocRow}>
                  <div className={styles.allocInfo}>
                    <div className={styles.allocInvoice}>{row.invoiceNo}</div>
                    <div className={styles.allocAvailable}>
                      Available {formatMmk(row.available)}
                    </div>
                  </div>
                  <div className={styles.allocActions}>
                    <InputNumber
                      min={0}
                      max={row.available}
                      value={row.amount || undefined}
                      onChange={(v) => setAllocationAmount(row.invoiceId, Number(v ?? 0))}
                      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(v) => Number(String(v ?? "").replace(/,/g, "")) as unknown as 0}
                      style={{ width: 120 }}
                    />
                    <button
                      type="button"
                      className={styles.allocFullBtn}
                      onClick={() => fillAllocation(row.invoiceId)}
                    >
                      Fill available
                    </button>
                  </div>
                </div>
              ))}
              <div
                className={`${styles.allocSumNote} ${allocatedSum > amount ? styles.allocSumDanger : ""}`}
              >
                Allocated {formatMmk(allocatedSum)} of {formatMmk(amount || 0)}
              </div>
            </div>
          ) : null}

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={submitting}
            disabled={!canSubmit}
          >
            Record payment
          </Button>
        </Form>
        </MobileDrawerBody>
      </Drawer>

      <LicenseCertificateScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(raw) => {
          setScannerOpen(false);
          void handleCertificateScan(raw);
        }}
      />
    </>
  );
}
