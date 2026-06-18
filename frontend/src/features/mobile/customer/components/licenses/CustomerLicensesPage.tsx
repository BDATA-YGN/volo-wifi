"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Radio, Search } from "lucide-react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import * as HomeApi from "../../home/query";
import * as LicenseApi from "../../licenses/query";
import { LICENSE_STATUS_FILTERS } from "../../licenses/constants";
import type { LicenseStatusFilter, MobileLicense } from "../../licenses/types";
import { summarizeLicenses } from "../../licenses/utils";
import LicenseCard from "./LicenseCard";
import styles from "./licenses.module.css";

function licenseMatchesSearch(license: MobileLicense, query: string): boolean {
  const q = query.toLowerCase();
  if (license.licenseCode.toLowerCase().includes(q)) return true;
  if (license.plan?.name.toLowerCase().includes(q)) return true;
  if (license.kit?.kitNumber?.toLowerCase().includes(q)) return true;
  if (license.kit?.dishSn?.toLowerCase().includes(q)) return true;
  if (license.kit?.township?.toLowerCase().includes(q)) return true;
  if (license.kit?.addressLine1?.toLowerCase().includes(q)) return true;
  return false;
}

export default function CustomerLicensesPage() {
  const [statusFilter, setStatusFilter] = useState<LicenseStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allLicenses, setAllLicenses] = useState<MobileLicense[]>([]);

  const homeQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["home"]),
    queryFn: () => HomeApi.getCustomerHomeSummary(),
  });

  const summaryQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["licenses-summary"]),
    queryFn: () => LicenseApi.listCustomerLicenses({ status: "all", page: 1, limit: 100 }),
  });

  const listQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["licenses", statusFilter, page]),
    queryFn: () =>
      LicenseApi.listCustomerLicenses({
        status: statusFilter,
        page,
        limit: 20,
      }),
  });

  const summary = useMemo(
    () => summarizeLicenses(summaryQuery.data?.data ?? []),
    [summaryQuery.data?.data],
  );

  useEffect(() => {
    const rows = listQuery.data?.data;
    if (!rows) return;

    setAllLicenses((prev) => {
      if (page === 1) return rows;
      const seen = new Set(prev.map((l) => l.id));
      return [...prev, ...rows.filter((l) => !seen.has(l.id))];
    });
  }, [listQuery.data?.data, page]);

  const filteredLicenses = useMemo(() => {
    const q = search.trim();
    if (!q) return allLicenses;
    return allLicenses.filter((license) => licenseMatchesSearch(license, q));
  }, [allLicenses, search]);

  const meta = listQuery.data?.meta;
  const hasMore = meta ? meta.currentPage < meta.totalPages : false;
  const isInitialLoading = listQuery.isLoading && page === 1;

  const handleFilterChange = (value: LicenseStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
    setAllLicenses([]);
  };

  return (
    <div className={styles.page}>
      {/* <section className={styles.hero} aria-label="Your licenses">
        <div className={styles.heroGlow} aria-hidden />
        <h2 className={styles.heroTitle}>My licenses</h2>
        <p className={styles.heroDesc}>
          Starlink service licenses on your account — plan, device, and coverage dates.
        </p>
      </section> */}

      {homeQuery.data || summaryQuery.data ? (
        <div className={styles.summaryGrid}>
          <div className={clsx(styles.summaryCard, styles.summaryCardAccent)}>
            <span className={styles.summaryLabel}>Active</span>
            <span className={styles.summaryValue}>
              {homeQuery.data?.activeLicenses ?? summary.activeCount}
            </span>
            <span className={styles.summarySub}>In good standing</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Total</span>
            <span className={styles.summaryValue}>
              {summaryQuery.data?.meta.totalRows ?? summary.total}
            </span>
            <span className={styles.summarySub}>
              {summary.withDeviceCount} with device
              {summary.suspendedCount > 0 ? ` · ${summary.suspendedCount} suspended` : ""}
            </span>
          </div>
        </div>
      ) : null}

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} size={18} aria-hidden />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search by code, plan, kit, or location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search licenses"
        />
      </div>

      <div className={styles.filterRow} role="tablist" aria-label="License status filter">
        {LICENSE_STATUS_FILTERS.map((option) => (
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
          <span>Loading licenses…</span>
        </div>
      ) : listQuery.isError ? (
        <div className={styles.errorWrap}>
          Could not load licenses.
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => void listQuery.refetch()}
          >
            Try again
          </button>
        </div>
      ) : filteredLicenses.length === 0 ? (
        <div className={styles.emptyWrap}>
          <span className={styles.emptyIcon} aria-hidden>
            <Radio size={22} />
          </span>
          <strong className={styles.emptyTitle}>
            {search.trim() ? "No matching licenses" : "No licenses here"}
          </strong>
          <span>
            {search.trim()
              ? "Try another code, plan name, or location."
              : statusFilter === "ACTIVE"
                ? "You have no active licenses right now."
                : statusFilter === "SUSPENDED"
                  ? "Suspended licenses will appear here."
                  : statusFilter === "TERMINATED"
                    ? "Terminated licenses will appear here."
                    : "Licenses registered to your account will show up here."}
          </span>
        </div>
      ) : (
        <>
          <div className={styles.cardList}>
            {filteredLicenses.map((license) => (
              <LicenseCard key={license.id} license={license} />
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
    </div>
  );
}
