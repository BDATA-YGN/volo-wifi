"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { FileText, Search, Wallet } from "lucide-react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { resolveCurrencyCode } from "@/common/utils/formatCurrency";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import * as PaymentApi from "../../payments/query";
import { PAYMENT_STATUS_FILTERS } from "../../payments/constants";
import type { MobileCustomerPayment, PaymentStatusFilter } from "../../payments/types";
import { formatPaymentAmount, summarizePayments } from "../../payments/utils";
import PaymentCard from "./PaymentCard";
import PaymentDetailDrawer from "./PaymentDetailDrawer";
import styles from "./payments.module.css";

function paymentMatchesSearch(payment: MobileCustomerPayment, query: string): boolean {
  const q = query.toLowerCase();
  if (payment.referenceNo?.toLowerCase().includes(q)) return true;
  if (payment.license?.licenseCode.toLowerCase().includes(q)) return true;
  return payment.allocations.some((alloc) =>
    alloc.invoice?.invoiceNo.toLowerCase().includes(q),
  );
}

export default function CustomerPaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allPayments, setAllPayments] = useState<MobileCustomerPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<MobileCustomerPayment | null>(null);

  const summaryQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["payments-summary"]),
    queryFn: () => PaymentApi.listCustomerPayments({ status: "all", page: 1, limit: 100 }),
  });

  const listQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["payments", statusFilter, page]),
    queryFn: () =>
      PaymentApi.listCustomerPayments({
        status: statusFilter,
        page,
        limit: 20,
      }),
  });

  const summary = useMemo(
    () => summarizePayments(summaryQuery.data?.data ?? []),
    [summaryQuery.data?.data],
  );

  useEffect(() => {
    const rows = listQuery.data?.data;
    if (!rows) return;

    setAllPayments((prev) => {
      if (page === 1) return rows;
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...rows.filter((p) => !seen.has(p.id))];
    });
  }, [listQuery.data?.data, page]);

  const filteredPayments = useMemo(() => {
    const q = search.trim();
    if (!q) return allPayments;
    return allPayments.filter((payment) => paymentMatchesSearch(payment, q));
  }, [allPayments, search]);

  const meta = listQuery.data?.meta;
  const hasMore = meta ? meta.currentPage < meta.totalPages : false;
  const isInitialLoading = listQuery.isLoading && page === 1;
  const currency = resolveCurrencyCode(
    allPayments[0]?.currency ?? summaryQuery.data?.data[0]?.currency,
  );

  const handleFilterChange = (value: PaymentStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
    setAllPayments([]);
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-label="Payment history">
        <div className={styles.heroGlow} aria-hidden />
        <h2 className={styles.heroTitle}>Payment history</h2>
        <p className={styles.heroDesc}>
          Read-only record of payments made toward your StarLink service invoices.
        </p>
      </section>

      {summaryQuery.data ? (
        <div className={styles.summaryGrid}>
          <div className={clsx(styles.summaryCard, styles.summaryCardAccent)}>
            <span className={styles.summaryLabel}>Confirmed</span>
            <span className={styles.summaryValue}>
              {formatPaymentAmount(summary.confirmedAmount, currency, true)}
            </span>
            <span className={styles.summarySub}>
              {summary.confirmedCount} payment{summary.confirmedCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Pending</span>
            <span className={styles.summaryValue}>{summary.pendingCount}</span>
            <span className={styles.summarySub}>
              {summary.pendingAmount > 0
                ? formatPaymentAmount(summary.pendingAmount, currency, true)
                : "Awaiting confirm"}
            </span>
          </div>
        </div>
      ) : null}

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} size={18} aria-hidden />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search license, invoice, or reference"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search payments"
        />
      </div>

      <div className={styles.filterRow} role="tablist" aria-label="Payment status">
        {PAYMENT_STATUS_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === option.value}
            className={`${styles.filterChip} ${statusFilter === option.value ? styles.filterChipActive : ""}`}
            onClick={() => handleFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isInitialLoading ? (
        <div className={styles.loadingWrap}>
          <Spin />
          <span>Loading payments…</span>
        </div>
      ) : listQuery.isError ? (
        <div className={styles.errorWrap}>
          Could not load payments.
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => void listQuery.refetch()}
          >
            Try again
          </button>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className={styles.emptyWrap}>
          <span className={styles.emptyIcon} aria-hidden>
            <Wallet size={22} />
          </span>
          <strong className={styles.emptyTitle}>
            {search.trim() ? "No matching payments" : "No payments yet"}
          </strong>
          <span>
            {search.trim()
              ? "Try another search or filter."
              : "Payments recorded by your collector will appear here."}
          </span>
        </div>
      ) : (
        <>
          <div className={styles.paymentList}>
            {filteredPayments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                onClick={() => setSelectedPayment(payment)}
              />
            ))}
          </div>

          {hasMore && !search.trim() ? (
            <button
              type="button"
              className={styles.loadMoreBtn}
              disabled={listQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              {listQuery.isFetching ? "Loading…" : "Load more"}
            </button>
          ) : null}
        </>
      )}

      <Link href={MOBILE_ROUTES.customer.invoices} className={styles.invoicesLink}>
        <FileText size={18} aria-hidden />
        View invoices & billing
      </Link>

      <PaymentDetailDrawer
        payment={selectedPayment}
        open={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
      />
    </div>
  );
}
