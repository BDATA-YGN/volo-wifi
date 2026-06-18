"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { FileText, Search } from "lucide-react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { resolveCurrencyCode } from "@/common/utils/formatCurrency";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import * as HomeApi from "../../home/query";
import * as InvoiceApi from "../../invoices/query";
import { INVOICE_FILTER_OPTIONS } from "../../invoices/constants";
import type { InvoiceFilter } from "../../invoices/types";
import { formatInvoiceAmount } from "../../invoices/utils";
import InvoiceCard from "./InvoiceCard";
import styles from "./invoices.module.css";

export default function CustomerInvoicesPage() {
  const [filter, setFilter] = useState<InvoiceFilter>("unpaid");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allInvoices, setAllInvoices] = useState<
    Awaited<ReturnType<typeof InvoiceApi.listCustomerInvoices>>["data"]
  >([]);

  const homeQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["home"]),
    queryFn: () => HomeApi.getCustomerHomeSummary(),
  });

  const listQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["invoices", filter, page]),
    queryFn: () =>
      InvoiceApi.listCustomerInvoices({
        page,
        limit: 20,
        filter,
      }),
  });

  useEffect(() => {
    const rows = listQuery.data?.data;
    if (!rows) return;

    setAllInvoices((prev) => {
      if (page === 1) return rows;
      const seen = new Set(prev.map((inv) => inv.id));
      return [...prev, ...rows.filter((inv) => !seen.has(inv.id))];
    });
  }, [listQuery.data?.data, page]);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allInvoices;
    return allInvoices.filter((inv) => inv.invoiceNo.toLowerCase().includes(q));
  }, [allInvoices, search]);

  const meta = listQuery.data?.meta;
  const hasMore = meta ? meta.currentPage < meta.totalPages : false;
  const isInitialLoading = listQuery.isLoading && page === 1;
  const unpaid = homeQuery.data?.unpaidInvoices;
  const currency = resolveCurrencyCode(unpaid?.currency);

  const handleFilterChange = (value: InvoiceFilter) => {
    setFilter(value);
    setPage(1);
    setAllInvoices([]);
  };

  return (
    <div className={styles.page}>
      {/* <section className={styles.hero} aria-label="Invoices and billing">
        <div className={styles.heroGlow} aria-hidden />
        <h2 className={styles.heroTitle}>Invoices & billing</h2>
        <p className={styles.heroDesc}>
          View service invoices, amounts due, and payment status for your licenses.
        </p>
      </section> */}

      {homeQuery.data ? (
        <div className={styles.summaryGrid}>
          <div className={clsx(styles.summaryCard, styles.summaryCardAccent)}>
            <span className={styles.summaryLabel}>Outstanding</span>
            <span className={styles.summaryValue}>
              {formatInvoiceAmount(unpaid?.totalDue ?? 0, currency, true)}
            </span>
            <span className={styles.summarySub}>
              {unpaid?.count ?? 0} unpaid invoice{(unpaid?.count ?? 0) === 1 ? "" : "s"}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Active licenses</span>
            <span className={styles.summaryValue}>{homeQuery.data.activeLicenses}</span>
            <span className={styles.summarySub}>On your account</span>
          </div>
        </div>
      ) : null}

      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} size={18} aria-hidden />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search by invoice number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search invoices"
        />
      </div>

      <div className={styles.filterRow} role="tablist" aria-label="Invoice filter">
        {INVOICE_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={filter === option.value}
            className={`${styles.filterChip} ${filter === option.value ? styles.filterChipActive : ""}`}
            onClick={() => handleFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isInitialLoading ? (
        <div className={styles.loadingWrap}>
          <Spin />
          <span>Loading invoices…</span>
        </div>
      ) : listQuery.isError ? (
        <div className={styles.errorWrap}>
          Could not load invoices.
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => void listQuery.refetch()}
          >
            Try again
          </button>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className={styles.emptyWrap}>
          <span className={styles.emptyIcon} aria-hidden>
            <FileText size={22} />
          </span>
          <strong className={styles.emptyTitle}>
            {search.trim() ? "No matching invoices" : "No invoices here"}
          </strong>
          <span>
            {search.trim()
              ? "Try another invoice number or filter."
              : filter === "unpaid"
                ? "You have no outstanding invoices right now."
                : filter === "paid"
                  ? "Paid invoices will appear here."
                  : "Invoices for your licenses will show up when issued."}
          </span>
        </div>
      ) : (
        <>
          <div className={styles.cardList}>
            {filteredInvoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
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
