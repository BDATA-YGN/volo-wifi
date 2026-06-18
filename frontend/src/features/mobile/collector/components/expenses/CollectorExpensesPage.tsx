"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Receipt } from "lucide-react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import type { ExpenseClaimRecord } from "../../expenses/interface";
import * as ExpenseApi from "../../expenses/query";
import {
  EXPENSE_STATUS_FILTERS,
  type ExpenseStatusFilter,
} from "../../expenses/constants";
import { summarizeExpenses } from "../../expenses/utils";
import CreateExpenseDrawer from "./CreateExpenseDrawer";
import ExpenseClaimCard from "./ExpenseClaimCard";
import ExpenseSummaryStrip from "./ExpenseSummaryStrip";
import styles from "./expenses.module.css";

export default function CollectorExpensesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<ExpenseStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [allClaims, setAllClaims] = useState<ExpenseClaimRecord[]>([]);

  const summaryQuery = useQuery({
    queryKey: ["mobile-collector-expenses-summary"],
    queryFn: () => ExpenseApi.listCollectorExpenses({ status: "all", page: 1, limit: 100 }),
  });

  const listQuery = useQuery({
    queryKey: ["mobile-collector-expenses", statusFilter, page],
    queryFn: () =>
      ExpenseApi.listCollectorExpenses({
        status: statusFilter,
        page,
        limit: 20,
      }),
  });

  const summary = useMemo(
    () => summarizeExpenses(summaryQuery.data?.data ?? []),
    [summaryQuery.data?.data],
  );

  useEffect(() => {
    const rows = listQuery.data?.data;
    if (!rows) return;

    setAllClaims((prev) => {
      if (page === 1) return rows;
      const seen = new Set(prev.map((c) => c.id));
      const appended = rows.filter((c) => !seen.has(c.id));
      return [...prev, ...appended];
    });
  }, [listQuery.data?.data, page]);

  const meta = listQuery.data?.meta;
  const hasMore = meta ? meta.currentPage < meta.totalPages : false;
  const isLoading = listQuery.isLoading;
  const isError = listQuery.isError;

  const handleFilterChange = (value: ExpenseStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
    setAllClaims([]);
  };

  const handleCreated = (claimId: string) => {
    void summaryQuery.refetch();
    router.push(`/collector/expenses/${claimId}`);
  };

  return (
    <div className={styles.page}>
      <ExpenseSummaryStrip
        draftCount={summary.draftCount}
        draftAmount={summary.draftAmount}
        submittedCount={summary.submittedCount}
        submittedAmount={summary.submittedAmount}
        approvedCount={summary.approvedCount}
        approvedAmount={summary.approvedAmount}
      />

      <div className={styles.filterRow} role="tablist" aria-label="Filter by status">
        {EXPENSE_STATUS_FILTERS.map((item) => (
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

      {isLoading ? (
        <div className={styles.loadingWrap}>
          <Spin />
          <span>Loading claims…</span>
        </div>
      ) : isError ? (
        <div className={styles.errorWrap}>
          Could not load expense claims.
          <button type="button" className={styles.retryBtn} onClick={() => void listQuery.refetch()}>
            Try again
          </button>
        </div>
      ) : allClaims.length === 0 ? (
        <div className={styles.emptyState}>
          <Receipt size={32} color="#94a3b8" style={{ marginBottom: "0.75rem" }} aria-hidden />
          <h3 className={styles.emptyTitle}>No expense claims</h3>
          <p className={styles.emptyDesc}>
            {statusFilter === "all"
              ? "Create a draft claim for your trip or daily expenses."
              : `No ${statusFilter.toLowerCase()} claims found.`}
          </p>
        </div>
      ) : (
        <>
          <div className={styles.claimList}>
            {allClaims.map((claim) => (
              <ExpenseClaimCard key={claim.id} claim={claim} />
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
        onClick={() => setCreateOpen(true)}
        aria-label="New expense claim"
      >
        <Plus size={18} aria-hidden />
        New claim
      </button>

      <CreateExpenseDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
