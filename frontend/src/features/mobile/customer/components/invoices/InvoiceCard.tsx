import Link from "next/link";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import type { MobileInvoice } from "../../invoices/types";
import {
  formatInvoiceAmount,
  formatInvoiceDate,
  formatInvoicePeriod,
  invoiceStatusLabel,
  invoiceStatusTone,
  isInvoiceOverdue,
} from "../../invoices/utils";
import styles from "./invoices.module.css";

interface InvoiceCardProps {
  invoice: MobileInvoice;
}

export default function InvoiceCard({ invoice }: InvoiceCardProps) {
  const overdue = isInvoiceOverdue(invoice.dueAt, invoice.status);
  const issued = formatInvoiceDate(invoice.issuedAt);
  const due = formatInvoiceDate(invoice.dueAt);
  const hasBalance = invoice.balanceDue > 0;

  return (
    <Link
      href={`${MOBILE_ROUTES.customer.invoices}/${invoice.id}`}
      className={clsx(styles.invoiceCard, overdue && styles.invoiceCardOverdue)}
    >
      <div className={styles.invoiceTop}>
        <div>
          <h3 className={styles.invoiceNo}>{invoice.invoiceNo}</h3>
          <p className={styles.invoicePeriod}>
            {formatInvoicePeriod(invoice.periodStart, invoice.periodEnd)}
          </p>
        </div>
        <span className={clsx(styles.statusBadge, styles[invoiceStatusTone(invoice.status)])}>
          {invoiceStatusLabel(invoice.status)}
        </span>
      </div>

      <div className={styles.invoiceAmounts}>
        <div className={styles.amountBlock}>
          <span className={styles.amountLabel}>Total</span>
          <span className={styles.amountValue}>
            {formatInvoiceAmount(invoice.total, invoice.currency, true)}
          </span>
        </div>
        <div className={styles.amountBlock} style={{ textAlign: "right" }}>
          <span className={styles.amountLabel}>{hasBalance ? "Balance due" : "Paid"}</span>
          <span
            className={clsx(
              styles.amountValue,
              hasBalance && styles.amountValueDue,
            )}
          >
            {hasBalance
              ? formatInvoiceAmount(invoice.balanceDue, invoice.currency, true)
              : formatInvoiceAmount(invoice.paidTotal, invoice.currency, true)}
          </span>
        </div>
        <ChevronRight className={styles.cardChevron} size={18} aria-hidden />
      </div>

      <div className={styles.invoiceMeta}>
        {issued ? <span>Issued {issued}</span> : null}
        {due ? <span>Due {due}</span> : null}
        {overdue ? <span className={styles.overdueBadge}>Overdue</span> : null}
      </div>
    </Link>
  );
}
