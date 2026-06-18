"use client";

import Link from "next/link";
import { Drawer } from "antd";
import clsx from "clsx";
import { useMobileThemeStore } from "@/features/mobile/shared/mobileThemeStore";
import { getMobileDrawerStyles } from "@/features/mobile/shared/mobileDrawerChrome";
import drawerStyles from "@/features/mobile/shared/components/mobileDrawerPortal.module.css";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import type { MobileCustomerPayment } from "../../payments/types";
import {
  allocatedTotal,
  formatPaymentAmount,
  formatPaymentDate,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
} from "../../payments/utils";
import styles from "./payments.module.css";

interface PaymentDetailDrawerProps {
  payment: MobileCustomerPayment | null;
  open: boolean;
  onClose: () => void;
}

export default function PaymentDetailDrawer({
  payment,
  open,
  onClose,
}: PaymentDetailDrawerProps) {
  const colorScheme = useMobileThemeStore((s) => s.theme);
  const chrome = getMobileDrawerStyles(colorScheme);

  if (!payment) return null;

  const licenseCode = payment.license?.licenseCode ?? "—";
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
        ...chrome,
        body: {
          ...chrome.body,
          padding: 0,
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0))",
          maxHeight: "85vh",
          overflowY: "auto",
        },
      }}
    >
      <div
        className={drawerStyles.drawerPortalTheme}
        data-theme={colorScheme}
        data-actor="customer"
      >
      <div className={drawerStyles.drawerStatusBadge}>
        <span className={clsx(styles.statusBadge, styles[paymentStatusTone(payment.status)])}>
          {paymentStatusLabel(payment.status)}
        </span>
      </div>

      <section className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>License</div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>License code</span>
          <span className={styles.detailValue}>{licenseCode}</span>
        </div>
      </section>

      <section className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>Payment</div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Amount</span>
          <span className={styles.detailValue}>
            {formatPaymentAmount(payment.amount, payment.currency)}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Method</span>
          <span className={styles.detailValue}>{paymentMethodLabel(payment.method)}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Paid at</span>
          <span className={styles.detailValue}>
            {formatPaymentDate(payment.paidAt) ?? "—"}
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
          Invoice allocations ({formatPaymentAmount(allocTotal, payment.currency)})
        </div>
        {payment.allocations.length === 0 ? (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>None</span>
            <span className={styles.detailValue}>—</span>
          </div>
        ) : (
          payment.allocations.map((alloc) => (
            <div key={alloc.id} className={styles.allocLine}>
              {alloc.invoice ? (
                <Link
                  href={`${MOBILE_ROUTES.customer.invoices}/${alloc.invoice.id}`}
                  className={styles.allocLink}
                  onClick={onClose}
                >
                  {alloc.invoice.invoiceNo}
                </Link>
              ) : (
                <span>{alloc.invoiceId}</span>
              )}
              <strong>{formatPaymentAmount(alloc.amount, payment.currency)}</strong>
            </div>
          ))
        )}
      </section>

      {payment.status === "PENDING" ? (
        <p className={styles.detailHint}>
          This payment is awaiting finance confirmation before it is fully applied to your
          invoices.
        </p>
      ) : null}
      </div>
    </Drawer>
  );
}
