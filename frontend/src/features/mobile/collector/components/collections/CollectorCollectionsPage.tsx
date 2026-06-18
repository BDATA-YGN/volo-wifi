"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { resolveCurrencyCode } from "@/common/utils/formatCurrency";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import * as CollectionApi from "../../collections/query";
import { COLLECTION_SCOPE_FILTERS } from "../../collections/constants";
import type { CollectionScopeFilter } from "../../collections/types";
import CollectionCard from "./CollectionCard";
import CollectionSummaryStrip from "./CollectionSummaryStrip";
import styles from "./collections.module.css";

const SCOPE_FILTERS: CollectionScopeFilter[] = ["all", "today", "tomorrow", "overdue", "completed"];

function parseScopeFilter(value: string | null): CollectionScopeFilter {
  if (value && SCOPE_FILTERS.includes(value as CollectionScopeFilter)) {
    return value as CollectionScopeFilter;
  }
  return "all";
}

export default function CollectorCollectionsPage() {
  const searchParams = useSearchParams();
  const initialScope = searchParams.get("scope");
  const [scopeFilter, setScopeFilter] = useState<CollectionScopeFilter>(() =>
    parseScopeFilter(initialScope),
  );
  const [page, setPage] = useState(1);
  const [allCollections, setAllCollections] = useState<
    Awaited<ReturnType<typeof CollectionApi.listCollectorCollections>>["data"]
  >([]);

  const homeQuery = useQuery({
    queryKey: mobileQueryKey("collector", ["home"]),
    queryFn: () => CollectionApi.getCollectorHomeSummary(),
  });

  const overdueQuery = useQuery({
    queryKey: mobileQueryKey("collector", ["collections-overdue-count"]),
    queryFn: () => CollectionApi.listCollectorCollections({ scope: "overdue", page: 1, limit: 1 }),
  });

  const listQuery = useQuery({
    queryKey: mobileQueryKey("collector", ["collections", scopeFilter, page]),
    queryFn: () =>
      CollectionApi.listCollectorCollections({
        scope: scopeFilter,
        page,
        limit: 20,
      }),
  });

  useEffect(() => {
    const rows = listQuery.data?.data;
    if (!rows) return;

    setAllCollections((prev) => {
      if (page === 1) return rows;
      const seen = new Set(prev.map((c) => c.id));
      return [...prev, ...rows.filter((c) => !seen.has(c.id))];
    });
  }, [listQuery.data?.data, page]);

  const meta = listQuery.data?.meta;
  const hasMore = meta ? meta.currentPage < meta.totalPages : false;

  const handleFilterChange = (value: CollectionScopeFilter) => {
    setScopeFilter(value);
    setPage(1);
    setAllCollections([]);
  };

  const home = homeQuery.data;
  const overdueCount = overdueQuery.data?.meta.totalRows ?? 0;

  return (
    <div className={styles.page}>
      <CollectionSummaryStrip
        assignedToday={home?.assignedCollectionsToday ?? 0}
        collectedToday={home?.collectedAmountToday ?? 0}
        overdueCount={overdueCount}
        currency={resolveCurrencyCode(home?.currency)}
      />

      <div className={styles.filterRow} role="tablist" aria-label="Filter collections">
        {COLLECTION_SCOPE_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={scopeFilter === item.value}
            className={`${styles.filterChip} ${
              scopeFilter === item.value ? styles.filterChipActive : ""
            }`}
            onClick={() => handleFilterChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {listQuery.isLoading && page === 1 ? (
        <div className={styles.loadingWrap}>
          <Spin />
          <span>Loading collections…</span>
        </div>
      ) : listQuery.isError ? (
        <div className={styles.errorWrap}>
          Could not load collections.
          <button type="button" className={styles.retryBtn} onClick={() => void listQuery.refetch()}>
            Try again
          </button>
        </div>
      ) : allCollections.length === 0 ? (
        <div className={styles.emptyState}>
          <ClipboardList size={32} color="#94a3b8" style={{ marginBottom: "0.75rem" }} aria-hidden />
          <h3 className={styles.emptyTitle}>No collections here</h3>
          <p className={styles.emptyDesc}>
            {scopeFilter === "all"
              ? "No scheduled visits assigned to you right now."
              : scopeFilter === "today"
                ? "You have no visits scheduled for today."
                : scopeFilter === "tomorrow"
                  ? "You have no visits scheduled for tomorrow."
                  : scopeFilter === "overdue"
                    ? "No overdue visits — you're up to date."
                    : scopeFilter === "completed"
                      ? "Completed visits will appear here after you record outcomes."
                      : "Assigned collection visits will appear here."}
          </p>
        </div>
      ) : (
        <>
          <div className={styles.collectionList}>
            {allCollections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
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
