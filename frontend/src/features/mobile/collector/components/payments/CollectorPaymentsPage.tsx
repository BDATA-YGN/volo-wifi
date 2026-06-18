"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Spin } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as PaymentApi from "../../payments/query";
import {
  PAYMENT_STATUS_FILTERS,
} from "../../payments/constants";
import type { MobilePaymentRecord, PaymentStatusFilter } from "../../payments/types";
import { summarizePayments } from "../../payments/utils";
import PaymentCard from "./PaymentCard";
import PaymentDetailDrawer from "./PaymentDetailDrawer";
import PaymentSummaryStrip from "./PaymentSummaryStrip";
import RecordPaymentDrawer from "./RecordPaymentDrawer";
import styles from "./payments.module.css";

export default function CollectorPaymentsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [allPayments, setAllPayments] = useState<MobilePaymentRecord[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<MobilePaymentRecord | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["mobile-collector-payments-summary"],
    queryFn: () => PaymentApi.listCollectorPayments({ status: "all", page: 1, limit: 100 }),
  });

  const listQuery = useQuery({
    queryKey: ["mobile-collector-payments", statusFilter, page],
    queryFn: () =>
      PaymentApi.listCollectorPayments({
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

  const meta = listQuery.data?.meta;
  const hasMore = meta ? meta.currentPage < meta.totalPages : false;

  const handleFilterChange = (value: PaymentStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
    setAllPayments([]);
  };

  const refreshLists = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["mobile-collector-payments"] }),
      queryClient.invalidateQueries({ queryKey: ["mobile-collector-payments-summary"] }),
    ]);
  };

  return (
    <div className={styles.page}>
      <PaymentSummaryStrip
        totalCount={summary.total}
        pendingCount={summary.pendingCount}
        pendingAmount={summary.pendingAmount}
        confirmedCount={summary.confirmedCount}
        confirmedAmount={summary.confirmedAmount}
      />

      <div className={styles.filterRow} role="tablist" aria-label="Filter by status">
        {PAYMENT_STATUS_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === item.value}
            className={`${styles.filterChip} ${statusFilter === item.value ? styles.filterChipActive : ""}`}
            onClick={() => handleFilterChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {listQuery.isLoading && page === 1 ? (
        <div className={styles.loadingWrap}>
          <Spin />
          <span>Loading payments…</span>
        </div>
      ) : listQuery.isError ? (
        <div className={styles.errorWrap}>
          Could not load payments.
          <button type="button" className={styles.retryBtn} onClick={() => void listQuery.refetch()}>
            Try again
          </button>
        </div>
      ) : allPayments.length === 0 ? (
        <div className={styles.emptyState}>
          <Wallet size={32} color="#94a3b8" style={{ marginBottom: "0.75rem" }} aria-hidden />
          <h3 className={styles.emptyTitle}>No payments recorded</h3>
          <p className={styles.emptyDesc}>
            Record cash or transfer payments and allocate them to customer invoices.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.paymentList}>
            {allPayments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                onClick={() => setSelectedPayment(payment)}
              />
            ))}
          </div>

          {hasMore ? (
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

      <button
        type="button"
        className={styles.fab}
        onClick={() => setRecordOpen(true)}
        aria-label="Record payment"
      >
        <Plus size={18} aria-hidden />
        Record payment
      </button>

      <RecordPaymentDrawer
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onRecorded={() => {
          setPage(1);
          setAllPayments([]);
          void refreshLists();
        }}
      />

      <PaymentDetailDrawer
        payment={selectedPayment}
        open={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
      />
    </div>
  );
}
