"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import * as SupportApi from "../../support/query";
import { SUPPORT_SCOPE_FILTERS } from "../../support/constants";
import type { SupportTicketScopeFilter } from "../../support/types";
import SupportTicketCard from "./SupportTicketCard";
import CreateSupportTicketDrawer from "./CreateSupportTicketDrawer";
import styles from "./support.module.css";

export default function CollectorSupportPage() {
  const searchParams = useSearchParams();
  const initialScope = searchParams.get("scope");
  const [scopeFilter, setScopeFilter] = useState<SupportTicketScopeFilter>(() => {
    if (initialScope === "mine" || initialScope === "queue" || initialScope === "all") {
      return initialScope;
    }
    return "mine";
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [allTickets, setAllTickets] = useState<
    Awaited<ReturnType<typeof SupportApi.listCollectorSupportTickets>>["data"]
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
    queryKey: mobileQueryKey("collector", ["support", scopeFilter, debouncedSearch, page]),
    queryFn: () =>
      SupportApi.listCollectorSupportTickets({
        scope: scopeFilter,
        status: "active",
        search: debouncedSearch,
        page,
        limit: 20,
      }),
  });

  useEffect(() => {
    const rows = listQuery.data?.data;
    if (!rows) return;
    setAllTickets((prev) => {
      if (page === 1) return rows;
      const seen = new Set(prev.map((t) => t.id));
      return [...prev, ...rows.filter((t) => !seen.has(t.id))];
    });
  }, [listQuery.data?.data, page]);

  const meta = listQuery.data?.meta;
  const hasMore = meta ? meta.currentPage < meta.totalPages : false;
  const home = homeQuery.data;

  const handleScopeChange = (value: SupportTicketScopeFilter) => {
    setScopeFilter(value);
    setPage(1);
    setAllTickets([]);
  };

  return (
    <div className={styles.page}>
      <div className={styles.summaryStrip}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>My open tickets</span>
          <span className={styles.summaryValue}>{home?.myOpenSupportTickets ?? "—"}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Unassigned queue</span>
          <span className={styles.summaryValue}>{home?.unassignedSupportQueue ?? "—"}</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} size={16} aria-hidden />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search ticket, customer, license…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              setAllTickets([]);
            }}
            aria-label="Search support tickets"
          />
        </div>
        <button type="button" className={styles.createBtn} onClick={() => setCreateOpen(true)}>
          <Plus size={16} style={{ verticalAlign: "middle", marginRight: "0.25rem" }} aria-hidden />
          New
        </button>
      </div>

      <div className={styles.filterRow} role="tablist" aria-label="Filter tickets">
        {SUPPORT_SCOPE_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={scopeFilter === item.value}
            className={`${styles.filterChip} ${scopeFilter === item.value ? styles.filterChipActive : ""}`}
            onClick={() => handleScopeChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {listQuery.isLoading && page === 1 ? (
        <div className={styles.loadingWrap}>
          <Spin />
          <span>Loading tickets…</span>
        </div>
      ) : listQuery.isError ? (
        <div className={styles.errorWrap}>
          Could not load support tickets.
          <button type="button" className={styles.btnPrimary} style={{ marginTop: "0.75rem" }} onClick={() => void listQuery.refetch()}>
            Try again
          </button>
        </div>
      ) : allTickets.length === 0 ? (
        <div className={styles.emptyWrap}>
          <strong>No support tickets</strong>
          <span>Create a ticket when helping a customer in the field.</span>
        </div>
      ) : (
        <>
          <div className={styles.cardList}>
            {allTickets.map((ticket) => (
              <SupportTicketCard key={ticket.id} ticket={ticket} />
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

      <CreateSupportTicketDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
