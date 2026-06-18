"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Pin, Search } from "lucide-react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import * as ContentApi from "../../content/query";
import { CONTENT_TYPE_FILTERS } from "../../content/constants";
import type { ContentTypeFilter } from "../../content/types";
import ContentPostCard from "./ContentPostCard";
import styles from "./content.module.css";

export default function CustomerContentPage() {
  const [typeFilter, setTypeFilter] = useState<ContentTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<
    Awaited<ReturnType<typeof ContentApi.listCustomerContent>>["data"]
  >([]);

  const listQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["content", typeFilter, page]),
    queryFn: () =>
      ContentApi.listCustomerContent({
        page,
        limit: 20,
        type: typeFilter,
      }),
  });

  useEffect(() => {
    const rows = listQuery.data?.data;
    if (!rows) return;

    setAllPosts((prev) => {
      if (page === 1) return rows;
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...rows.filter((p) => !seen.has(p.id))];
    });
  }, [listQuery.data?.data, page]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPosts;
    return allPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) || post.body.toLowerCase().includes(q),
    );
  }, [allPosts, search]);

  const pinnedPosts = useMemo(
    () => filteredPosts.filter((post) => post.isPinned),
    [filteredPosts],
  );
  const regularPosts = useMemo(
    () => filteredPosts.filter((post) => !post.isPinned),
    [filteredPosts],
  );

  const meta = listQuery.data?.meta;
  const hasMore = meta ? meta.currentPage < meta.totalPages : false;
  const isInitialLoading = listQuery.isLoading && page === 1;

  const handleFilterChange = (value: ContentTypeFilter) => {
    setTypeFilter(value);
    setPage(1);
    setAllPosts([]);
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-label="Notices and guides">
        <div className={styles.heroGlow} aria-hidden />
        <h2 className={styles.heroTitle}>Notices & guides</h2>
        <p className={styles.heroDesc}>
          Service updates, how-to guides, and billing policies published for your account.
        </p>
      </section>

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} size={18} aria-hidden />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search notices and guides"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search content"
        />
      </div>

      <div className={styles.filterRow} role="tablist" aria-label="Content type">
        {CONTENT_TYPE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={typeFilter === filter.value}
            className={`${styles.filterChip} ${typeFilter === filter.value ? styles.filterChipActive : ""}`}
            onClick={() => handleFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isInitialLoading ? (
        <div className={styles.loadingWrap}>
          <Spin />
          <span>Loading notices and guides…</span>
        </div>
      ) : listQuery.isError ? (
        <div className={styles.errorWrap}>
          Could not load content.
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => void listQuery.refetch()}
          >
            Try again
          </button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className={styles.emptyWrap}>
          <span className={styles.emptyIcon} aria-hidden>
            <BookOpen size={22} />
          </span>
          <strong className={styles.emptyTitle}>
            {search.trim() ? "No matching content" : "Nothing published yet"}
          </strong>
          <span>
            {search.trim()
              ? "Try a different search or filter."
              : "Check back later for notices, guides, and policies."}
          </span>
        </div>
      ) : (
        <>
          {pinnedPosts.length > 0 ? (
            <section aria-label="Pinned content">
              <h3 className={styles.sectionLabel}>
                <Pin size={14} aria-hidden />
                Pinned
              </h3>
              <div className={styles.cardList}>
                {pinnedPosts.map((post) => (
                  <ContentPostCard key={post.id} post={post} pinnedHighlight />
                ))}
              </div>
            </section>
          ) : null}

          {regularPosts.length > 0 ? (
            <section aria-label={pinnedPosts.length > 0 ? "More content" : "Content list"}>
              {pinnedPosts.length > 0 ? (
                <h3 className={styles.sectionLabel}>Latest</h3>
              ) : null}
              <div className={styles.cardList}>
                {regularPosts.map((post) => (
                  <ContentPostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          ) : null}

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
    </div>
  );
}
