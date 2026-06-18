"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Spin,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { PAYMENT_METHOD_OPTIONS } from "../../payments/constants";
import { listCollectorLicenseInvoices } from "../../payments/query";
import type { MobileInvoiceAssignment } from "../../payments/types";
import AssignedInvoiceSearch from "../shared/AssignedInvoiceSearch";
import { OUTCOME_OPTIONS } from "../../collections/constants";
import { safeRecordCollectorCollectionOutcome } from "../../collections/query";
import type {
  MobileCollectionRecord,
  SmsCollectionResult,
  SmsPaymentMethod,
} from "../../collections/types";
import { formatMmk } from "../../collections/utils";
import styles from "./collections.module.css";

interface OutcomeFormValues {
  visitedAt?: Dayjs;
  collectedAmount: number;
  method: SmsPaymentMethod;
  referenceNo?: string;
  note?: string;
  recordPayment: boolean;
}

type AllocationRow = {
  invoiceId: string;
  invoiceNo: string;
  available: number;
  amount: number;
};

interface RecordOutcomeDrawerProps {
  open: boolean;
  collection: MobileCollectionRecord | null;
  onClose: () => void;
  onRecorded: () => void;
}

export default function RecordOutcomeDrawer({
  open,
  collection,
  onClose,
  onRecorded,
}: RecordOutcomeDrawerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<OutcomeFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Exclude<SmsCollectionResult, "PENDING">>("COLLECTED");
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [pendingHeldCount, setPendingHeldCount] = useState(0);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const prefillInvoiceIdRef = useRef<string | null>(null);

  const collectedAmount = Form.useWatch("collectedAmount", form) ?? 0;
  const recordPayment = Form.useWatch("recordPayment", form);

  const needsAmount = result === "COLLECTED" || result === "PARTIAL";
  const canRecordPayment = needsAmount && collectedAmount > 0 && recordPayment;

  const allocatedSum = useMemo(
    () => allocations.reduce((sum, row) => sum + (row.amount || 0), 0),
    [allocations],
  );

  const activeAllocations = allocations.filter((a) => a.amount > 0);

  const canSubmit =
    Boolean(collection) &&
    (!needsAmount ||
      (collectedAmount > 0 &&
        (!canRecordPayment || (activeAllocations.length > 0 && allocatedSum <= collectedAmount))));

  useEffect(() => {
    if (!open || !collection) return;

    setResult("COLLECTED");
    form.resetFields();
    form.setFieldsValue({
      visitedAt: dayjs(),
      collectedAmount: collection.invoice?.balanceDue ?? 0,
      method: "CASH",
      recordPayment: true,
      note: collection.note ?? undefined,
    });
    setAllocations([]);
    setPendingHeldCount(0);
    prefillInvoiceIdRef.current = collection.invoiceId;

    setLoadingInvoices(true);
    void listCollectorLicenseInvoices(collection.licenseId)
      .then(({ rows, pendingHeldCount: held }) => {
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
            form.setFieldValue("collectedAmount", match.available);
          }
          prefillInvoiceIdRef.current = null;
        }
      })
      .catch(() => message.error("Could not load invoices"))
      .finally(() => setLoadingInvoices(false));
  }, [open, collection, form, message]);

  const handleAssignedInvoiceSelect = (assignment: MobileInvoiceAssignment) => {
    const invoice = assignment.invoice;
    if (!invoice) return;

    prefillInvoiceIdRef.current = invoice.id;
    setAllocations((prev) =>
      prev.map((row) => ({
        ...row,
        amount: row.invoiceId === invoice.id ? row.available : 0,
      })),
    );
    if (invoice.available > 0) {
      form.setFieldValue("collectedAmount", invoice.available);
    }
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

  const autoAllocate = () => {
    let remaining = collectedAmount;
    setAllocations((prev) =>
      prev.map((row) => {
        if (remaining <= 0) return { ...row, amount: 0 };
        const next = Math.min(row.available, remaining);
        remaining -= next;
        return { ...row, amount: next };
      }),
    );
  };

  const fillAllocation = (invoiceId: string) => {
    setAllocations((prev) =>
      prev.map((row) => {
        if (row.invoiceId !== invoiceId) return row;
        const remaining = Math.max(0, collectedAmount - allocatedSum + row.amount);
        const next = Math.min(row.available, remaining || row.available);
        return { ...row, amount: next };
      }),
    );
  };

  const handleSubmit = async () => {
    if (!collection || !canSubmit) return;

    try {
      const values = await form.validateFields();

      if (canRecordPayment && activeAllocations.length === 0) {
        message.warning("Allocate to at least one invoice or turn off payment recording.");
        return;
      }

      setSubmitting(true);
      const payload = {
        result,
        visitedAt: values.visitedAt?.toISOString() ?? new Date().toISOString(),
        collectedAmount: needsAmount ? Math.floor(values.collectedAmount) : 0,
        note: values.note?.trim() || null,
        method: values.method,
        referenceNo: values.referenceNo?.trim() || null,
        allocations: canRecordPayment
          ? activeAllocations.map((a) => ({
              invoiceId: a.invoiceId,
              amount: Math.floor(a.amount),
            }))
          : undefined,
      };

      const response = await safeRecordCollectorCollectionOutcome(collection.id, payload);
      if (!response.success) {
        throw new Error(response.error?.message ?? "Failed to record outcome");
      }

      message.success("Visit outcome recorded");
      onClose();
      onRecorded();
    } catch (err) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      message.error(err instanceof Error ? err.message : "Failed to record outcome");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title="Record visit outcome"
      placement="bottom"
      size="auto"
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{
        body: {
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0))",
          maxHeight: "90vh",
          overflowY: "auto",
        },
      }}
    >
      {collection ? (
        <>
          <div className={styles.drawerHint}>
            Outcome for <strong>{collection.license?.licenseCode}</strong> —{" "}
            {collection.license?.customer?.fullName ?? "Customer"}. Payments are saved as{" "}
            <strong>PENDING</strong> until finance confirms.
          </div>

          <AssignedInvoiceSearch
            licenseId={collection.licenseId}
            onSelect={handleAssignedInvoiceSelect}
          />

          <div className={styles.outcomeGrid}>
            {OUTCOME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.outcomeOption} ${
                  result === option.value ? styles.outcomeOptionActive : ""
                }`}
                onClick={() => setResult(option.value)}
              >
                <span className={styles.outcomeOptionLabel}>{option.label}</span>
                <span className={styles.outcomeOptionDesc}>{option.description}</span>
              </button>
            ))}
          </div>

          <Form form={form} layout="vertical" requiredMark="optional">
            <Form.Item
              label="Visited at"
              name="visitedAt"
              rules={[{ required: true, message: "Select visit time" }]}
            >
              <DatePicker
                showTime
                size="large"
                style={{ width: "100%" }}
                format="D MMM YYYY, HH:mm"
              />
            </Form.Item>

            {needsAmount ? (
              <Form.Item
                label="Amount collected (MMK)"
                name="collectedAmount"
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
            ) : (
              <Form.Item name="collectedAmount" hidden>
                <InputNumber />
              </Form.Item>
            )}

            <Form.Item label="Visit note" name="note">
              <Input.TextArea rows={2} maxLength={2000} placeholder="What happened on this visit?" />
            </Form.Item>

            {needsAmount ? (
              <Form.Item name="recordPayment" valuePropName="checked">
                <Checkbox>Record pending payment for finance confirmation</Checkbox>
              </Form.Item>
            ) : null}

            {canRecordPayment ? (
              <>
                <Form.Item label="Payment method" name="method" rules={[{ required: true }]}>
                  <Select size="large" options={PAYMENT_METHOD_OPTIONS} />
                </Form.Item>

                <Form.Item label="Reference no." name="referenceNo">
                  <Input size="large" maxLength={120} placeholder="Transfer ref, receipt no." />
                </Form.Item>

                {loadingInvoices ? (
                  <div className={styles.loadingWrap}>
                    <Spin size="small" />
                    <span>Loading invoices…</span>
                  </div>
                ) : allocations.length === 0 ? (
                  <div className={styles.warningBanner}>
                    No collectible invoices for this license.
                    {pendingHeldCount > 0
                      ? ` ${pendingHeldCount} invoice(s) have balance held by other pending payments.`
                      : null}
                  </div>
                ) : (
                  <div className={styles.allocSection}>
                    <div className={styles.allocSectionHeader}>
                      <div className={styles.allocSectionTitle}>Allocate to invoices</div>
                      <button
                        type="button"
                        className={styles.allocFullBtn}
                        onClick={autoAllocate}
                      >
                        Auto-allocate oldest
                      </button>
                    </div>
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
                      className={`${styles.allocSumNote} ${allocatedSum > collectedAmount ? styles.allocSumDanger : ""}`}
                    >
                      Allocated {formatMmk(allocatedSum)} of {formatMmk(collectedAmount || 0)}
                    </div>
                  </div>
                )}
              </>
            ) : null}

            <Button
              type="primary"
              block
              size="large"
              loading={submitting}
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
            >
              Save outcome
            </Button>
          </Form>
        </>
      ) : null}
    </Drawer>
  );
}
