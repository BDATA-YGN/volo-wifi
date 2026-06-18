"use client";

import dayjs from "dayjs";
import { Drawer } from "antd";
import type { MobilePaymentRecord } from "../../payments/types";
import { allocatedTotal, formatMmk, methodLabel, paymentStatusLabel } from "../../payments/utils";
import PaymentStatusBadge from "./PaymentStatusBadge";
import styles from "./payments.module.css";

interface PaymentDetailDrawerProps {
  payment: MobilePaymentRecord | null;
  open: boolean;
  onClose: () => void;
}

export default function PaymentDetailDrawer({
  payment,
  open,
  onClose,
}: PaymentDetailDrawerProps) {
  if (!payment) return null;

  const customerName = payment.license?.customer?.fullName ?? "—";
  const licenseCode = payment.license?.licenseCode ?? "—";
  const township = payment.license?.customer?.township;
  const allocTotal = allocatedTotal(payment);

  return (
    <Drawer
      title="Payment detail"
      placement="bottom"
      height="auto"
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{
        body: {
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0))",
          maxHeight: "85vh",
          overflowY: "auto",
        },
      }}
    >
      <div style={{ marginBottom: "0.75rem" }}>
        <PaymentStatusBadge status={payment.status} />
      </div>

      <section className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>Customer & license</div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Customer</span>
          <span className={styles.detailValue}>{customerName}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>License</span>
          <span className={styles.detailValue}>{licenseCode}</span>
        </div>
        {township ? (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Township</span>
            <span className={styles.detailValue}>{township}</span>
          </div>
        ) : null}
      </section>

      <section className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>Payment</div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Amount</span>
          <span className={styles.detailValue}>{formatMmk(payment.amount, payment.currency)}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Method</span>
          <span className={styles.detailValue}>{methodLabel(payment.method)}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Status</span>
          <span className={styles.detailValue}>{paymentStatusLabel(payment.status)}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Paid at</span>
          <span className={styles.detailValue}>
            {payment.paidAt ? dayjs(payment.paidAt).format("D MMM YYYY, HH:mm") : "—"}
          </span>
        </div>
        {payment.referenceNo ? (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Reference</span>
            <span className={styles.detailValue}>{payment.referenceNo}</span>
          </div>
        ) : null}
        {payment.note?.trim() ? (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Note</span>
            <span className={styles.detailValue}>{payment.note}</span>
          </div>
        ) : null}
      </section>

      <section className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>
          Allocations ({formatMmk(allocTotal, payment.currency)})
        </div>
        {payment.allocations.length === 0 ? (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>None</span>
            <span className={styles.detailValue}>—</span>
          </div>
        ) : (
          payment.allocations.map((alloc) => (
            <div key={alloc.id} className={styles.allocLine}>
              <span>{alloc.invoice?.invoiceNo ?? alloc.invoiceId}</span>
              <strong>{formatMmk(alloc.amount, payment.currency)}</strong>
            </div>
          ))
        )}
      </section>

      {payment.status === "PENDING" ? (
        <p className={styles.mutedNote}>
          Finance will confirm this payment before it is applied to invoice balances.
        </p>
      ) : null}
    </Drawer>
  );
}
