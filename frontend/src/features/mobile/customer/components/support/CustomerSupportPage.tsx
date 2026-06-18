"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, Mail, Plus, Search } from "lucide-react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import * as HomeApi from "../../home/query";
import * as SupportInfoApi from "../../support/query";
import * as TicketApi from "../../support/tickets/query";
import { CUSTOMER_TICKET_STATUS_FILTERS } from "../../support/tickets/constants";
import type { CustomerTicketStatusFilter } from "../../support/tickets/types";
import CustomerSupportTicketCard from "./CustomerSupportTicketCard";
import CreateCustomerSupportTicketDrawer from "./CreateCustomerSupportTicketDrawer";
import styles from "./support.module.css";

export default function CustomerSupportPage() {
  const [statusFilter, setStatusFilter] = useState<CustomerTicketStatusFilter>("active");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [allTickets, setAllTickets] = useState<
    Awaited<ReturnType<typeof TicketApi.listCustomerSupportTickets>>["data"]
  >([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const homeQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["home"]),
    queryFn: () => HomeApi.getCustomerHomeSummary(),
  });

  const infoQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["support-info"]),
    queryFn: () => SupportInfoApi.getCustomerSupportInfo(),
  });

  const listQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["support-tickets", statusFilter, debouncedSearch, page]),
    queryFn: () =>
      TicketApi.listCustomerSupportTickets({
        status: statusFilter,
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
  const info = infoQuery.data;

  const handleFilterChange = (value: CustomerTicketStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
    setAllTickets([]);
  };

  return (
    <div className={styles.page}>
      {/* <section className={styles.hero} aria-label="Support">
        <div className={styles.heroGlow} aria-hidden />
        <span className={styles.heroIcon} aria-hidden>
          <Headphones size={22} />
        </span>
        <h2 className={styles.heroTitle}>Support tickets</h2>
        <p className={styles.heroDesc}>
          Open a ticket, track status, and chat with our team about billing or service issues.
        </p>
      </section> */}

      <div className={styles.summaryStrip}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Open tickets</span>
          <span className={styles.summaryValue}>{homeQuery.data?.openSupportTickets ?? "—"}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total listed</span>
          <span className={styles.summaryValue}>{meta?.totalRows ?? allTickets.length}</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} size={16} aria-hidden />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search ticket no. or subject"
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
          Open
        </button>
      </div>

      <div className={styles.filterRow} role="tablist" aria-label="Ticket status filter">
        {CUSTOMER_TICKET_STATUS_FILTERS.map((item) => (
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
          <span>Loading tickets…</span>
        </div>
      ) : listQuery.isError ? (
        <div className={styles.errorWrap}>
          Could not load your tickets.
          <button
            type="button"
            className={styles.btnPrimary}
            style={{ marginTop: "0.75rem" }}
            onClick={() => void listQuery.refetch()}
          >
            Try again
          </button>
        </div>
      ) : allTickets.length === 0 ? (
        <div className={styles.emptyWrap}>
          <strong>No tickets here</strong>
          <span>Open a ticket when you need help with billing, connectivity, or your account.</span>
          <button
            type="button"
            className={styles.btnPrimary}
            style={{ marginTop: "0.75rem", maxWidth: "14rem" }}
            onClick={() => setCreateOpen(true)}
          >
            Open ticket
          </button>
        </div>
      ) : (
        <>
          <div className={styles.cardList}>
            {allTickets.map((ticket) => (
              <CustomerSupportTicketCard key={ticket.id} ticket={ticket} />
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

      {/* {info ? (
        <section className={styles.section} aria-label="Contact">
          <div className={styles.sectionHeader}>Direct contact</div>
          <div className={styles.contactCard}>
            <span className={styles.contactLabel}>Service provider</span>
            <span className={styles.contactValue}>{info.companyLegalName}</span>
          </div>
          {info.billingContactEmail ? (
            <div className={styles.contactCard}>
              <span className={styles.contactLabel}>Billing email</span>
              <a href={`mailto:${info.billingContactEmail}`} className={styles.contactLink}>
                <Mail size={16} aria-hidden />
                {info.billingContactEmail}
              </a>
            </div>
          ) : (
            <div className={styles.contactCard}>
              <Link href={MOBILE_ROUTES.customer.profile} className={styles.contactLink}>
                View profile contacts
              </Link>
            </div>
          )}
        </section>
      ) : null} */}

      <CreateCustomerSupportTicketDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
