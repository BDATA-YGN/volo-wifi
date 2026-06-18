"use client";

import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import clsx from "clsx";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import * as InvoiceApi from "../../invoices/query";
import {
  formatInvoiceAmount,
  formatInvoiceDate,
  formatInvoicePeriod,
  invoiceStatusLabel,
  invoiceStatusTone,
  isInvoiceOverdue,
} from "../../invoices/utils";
import styles from "./invoices.module.css";

interface CustomerInvoiceDetailPageProps {
  invoiceId: string;
}

export default function CustomerInvoiceDetailPage({ invoiceId }: CustomerInvoiceDetailPageProps) {
  const detailQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["invoice", invoiceId]),
    queryFn: () => InvoiceApi.getCustomerInvoice(invoiceId),
  });

  const invoice = detailQuery.data;
  const lines = invoice?.lines ?? [];
  const overdue = invoice ? isInvoiceOverdue(invoice.dueAt, invoice.status) : false;

  if (detailQuery.isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading invoice…</span>
      </div>
    );
  }

  if (detailQuery.isError || !invoice) {
    return (
      <div className={styles.page}>
        <Link href={MOBILE_ROUTES.customer.invoices} className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden />
          Back to invoices
        </Link>
        <div className={styles.errorWrap}>
          Invoice not found.
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => void detailQuery.refetch()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href={MOBILE_ROUTES.customer.invoices} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        Back to invoices
      </Link>

      <section className={styles.detailHero} aria-label="Invoice summary">
        <div className={styles.detailHeroTop}>
          <div>
            <h1 className={styles.detailInvoiceNo}>{invoice.invoiceNo}</h1>
            <p className={styles.detailPeriod}>
              {formatInvoicePeriod(invoice.periodStart, invoice.periodEnd)}
            </p>
          </div>
          <span className={clsx(styles.statusBadge, styles[invoiceStatusTone(invoice.status)])}>
            {invoiceStatusLabel(invoice.status)}
          </span>
        </div>
        <div>
          <div className={styles.detailBalanceLabel}>
            {invoice.balanceDue > 0 ? "Balance due" : "Amount paid"}
          </div>
          <div className={styles.detailBalanceValue}>
            {invoice.balanceDue > 0
              ? formatInvoiceAmount(invoice.balanceDue, invoice.currency)
              : formatInvoiceAmount(invoice.paidTotal, invoice.currency)}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-label="Invoice dates">
        <div className={styles.sectionHeader}>Dates</div>
        <div className={styles.infoGrid}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Issued</span>
            <span className={styles.infoValue}>
              {formatInvoiceDate(invoice.issuedAt) ?? "—"}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Due</span>
            <span className={styles.infoValue}>
              {formatInvoiceDate(invoice.dueAt) ?? "—"}
              {overdue ? ` · Overdue` : ""}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Billing period</span>
            <span className={styles.infoValue}>
              {formatInvoicePeriod(invoice.periodStart, invoice.periodEnd)}
            </span>
          </div>
        </div>
      </section>

      {lines.length > 0 ? (
        <section className={styles.section} aria-label="Line items">
          <div className={styles.sectionHeader}>Line items</div>
          {lines.map((line) => (
            <div key={line.id} className={styles.lineRow}>
              <p className={styles.lineTitle}>{line.title}</p>
              <p className={styles.lineMeta}>
                {line.qty} × {formatInvoiceAmount(line.unitPrice, invoice.currency)}
                {line.accountCode
                  ? ` · ${line.accountCode.code} ${line.accountCode.name}`
                  : null}
              </p>
              <div className={styles.lineAmount}>
                {formatInvoiceAmount(line.amount, invoice.currency)}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className={styles.section} aria-label="Totals">
        <div className={styles.sectionHeader}>Summary</div>
        <div className={styles.totalsRow}>
          <span>Subtotal</span>
          <span>{formatInvoiceAmount(invoice.subtotal, invoice.currency)}</span>
        </div>
        {invoice.discount > 0 ? (
          <div className={styles.totalsRow}>
            <span>Discount</span>
            <span>−{formatInvoiceAmount(invoice.discount, invoice.currency)}</span>
          </div>
        ) : null}
        <div className={styles.totalsRowStrong}>
          <span>Total</span>
          <span>{formatInvoiceAmount(invoice.total, invoice.currency)}</span>
        </div>
        <div className={styles.totalsRow}>
          <span>Paid</span>
          <span>{formatInvoiceAmount(invoice.paidTotal, invoice.currency)}</span>
        </div>
        <div className={clsx(styles.totalsRowStrong, invoice.balanceDue > 0 && styles.totalsDue)}>
          <span>Balance due</span>
          <span>{formatInvoiceAmount(invoice.balanceDue, invoice.currency)}</span>
        </div>
      </section>

      <Link href={MOBILE_ROUTES.customer.payments} className={styles.paymentsLink}>
        <Wallet size={18} aria-hidden />
        View payment history
      </Link>
    </div>
  );
}
