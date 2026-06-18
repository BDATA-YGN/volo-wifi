"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Spin } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import * as AssignmentApi from "../../assignments/query";
import { ASSIGNMENT_FILTERS } from "../../assignments/constants";
import type { AssignmentStatusFilter } from "../../assignments/query";
import AssignmentCard from "./AssignmentCard";
import styles from "./assignments.module.css";

export default function CollectorAssignmentsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AssignmentStatusFilter>("open");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allRows, setAllRows] = useState<
    Awaited<ReturnType<typeof AssignmentApi.listCollectorAssignments>>["data"]
  >([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const homeQuery = useQuery({
    queryKey: mobileQueryKey("collector", ["home"]),
    queryFn: async () => {
      const { getCollectorHomeSummary } = await import("../../collections/query");
      return getCollectorHomeSummary();
    },
  });

  const listQuery = useQuery({
    queryKey: mobileQueryKey("collector", ["assignments", statusFilter, debouncedSearch, page]),
    queryFn: () =>
      AssignmentApi.listCollectorAssignments({
        status: statusFilter,
        search: debouncedSearch,
        page,
        limit: 20,
      }),
  });

  useEffect(() => {
    const rows = listQuery.data?.data;
    if (!rows) return;
    setAllRows((prev) => {
      if (page === 1) return rows;
      const seen = new Set(prev.map((r) => r.id));
      return [...prev, ...rows.filter((r) => !seen.has(r.id))];
    });
  }, [listQuery.data?.data, page]);

  const meta = listQuery.data?.meta;
  const hasMore = meta ? meta.currentPage < meta.totalPages : false;
  const home = homeQuery.data;

  const handleFilterChange = (value: AssignmentStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
    setAllRows([]);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    setAllRows([]);
  };

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: mobileQueryKey("collector", ["assignments"]) });
    void queryClient.invalidateQueries({ queryKey: mobileQueryKey("collector", ["home"]) });
  };

  return (
    <div className={styles.page}>
      <div className={styles.summaryStrip}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Open assignments</span>
          <span className={styles.summaryValue}>{home?.openInvoiceAssignments ?? "—"}</span>
          <span className={styles.summarySub}>Invoices to collect</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Listed</span>
          <span className={styles.summaryValue}>{meta?.totalRows ?? allRows.length}</span>
          <span className={styles.summarySub}>
            {statusFilter === "open" ? "Assigned or accepted" : "All statuses"}
          </span>
        </div>
      </div>

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} size={16} aria-hidden />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search invoice, license, customer…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          aria-label="Search assignments"
        />
      </div>

      <div className={styles.filterRow} role="tablist" aria-label="Filter assignments">
        {ASSIGNMENT_FILTERS.map((item) => (
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
          <span>Loading assignments…</span>
        </div>
      ) : listQuery.isError ? (
        <div className={styles.errorWrap}>
          Could not load assignments.
          <button type="button" className={styles.btnPrimary} style={{ marginTop: "0.75rem" }} onClick={() => void listQuery.refetch()}>
            Try again
          </button>
        </div>
      ) : allRows.length === 0 ? (
        <div className={styles.emptyWrap}>
          <strong>No invoice assignments</strong>
          <span>
            {statusFilter === "open"
              ? "You have no open assigned invoices right now."
              : "No assignments match your filters."}
          </span>
        </div>
      ) : (
        <>
          <div className={styles.cardList}>
            {allRows.map((row) => (
              <AssignmentCard key={row.id} assignment={row} onAccepted={refresh} />
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
    </div>
  );
}
