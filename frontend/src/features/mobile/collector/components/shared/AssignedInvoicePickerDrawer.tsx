"use client";

import { useEffect, useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { Drawer, Input, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { listCollectorInvoiceAssignments } from "../../payments/query";
import type { MobileInvoiceAssignment } from "../../payments/types";
import { formatMmk } from "../../payments/utils";
import styles from "../payments/payments.module.css";

const PAGE_SIZE = 20;
const MIN_SEARCH_LENGTH = 2;

interface AssignedInvoicePickerDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (assignment: MobileInvoiceAssignment) => void;
  licenseId?: string;
  initialSearch?: string;
}

export default function AssignedInvoicePickerDrawer({
  open,
  onClose,
  onSelect,
  licenseId,
  initialSearch = "",
}: AssignedInvoicePickerDrawerProps) {
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.trim());
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<MobileInvoiceAssignment[]>([]);

  useEffect(() => {
    if (!open) return;
    setSearch(initialSearch);
    setDebouncedSearch(initialSearch.trim());
    setPage(1);
    setRows([]);
  }, [open, initialSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setRows([]);
  }, [debouncedSearch, licenseId]);

  const canQuery = debouncedSearch.length >= MIN_SEARCH_LENGTH;

  const assignmentsQuery = useQuery({
    queryKey: mobileQueryKey("collector", [
      "invoice-assignments-picker",
      debouncedSearch,
      licenseId,
      page,
    ]),
    queryFn: () =>
      listCollectorInvoiceAssignments({
        search: debouncedSearch,
        status: "open",
        licenseId,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: open && canQuery,
  });

  const meta = assignmentsQuery.data?.meta;

  useEffect(() => {
    if (!assignmentsQuery.data) return;
    const pageRows = assignmentsQuery.data.data;
    setRows((prev) => (page === 1 ? pageRows : [...prev, ...pageRows]));
  }, [assignmentsQuery.data, page]);

  const hasMore = meta ? page < meta.totalPages : false;
  const totalRows = meta?.totalRows ?? 0;

  const handleSelect = (assignment: MobileInvoiceAssignment) => {
    onSelect(assignment);
    onClose();
  };

  return (
    <Drawer
      title="Assigned invoices"
      placement="bottom"
      height="78vh"
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{
        body: { padding: "0.75rem 1rem calc(1rem + env(safe-area-inset-bottom, 0))" },
      }}
    >
      <p className={styles.assignPickerIntro}>
        Search by invoice number, license code, customer name, or township.
      </p>

      <Input
        size="large"
        allowClear
        autoFocus
        prefix={<SearchOutlined className={styles.assignSearchIcon} />}
        placeholder="Invoice no., license, customer, township…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {!canQuery ? (
        <div className={styles.assignSearchEmpty}>
          Type at least {MIN_SEARCH_LENGTH} characters to search.
        </div>
      ) : assignmentsQuery.isFetching && page === 1 ? (
        <div className={styles.assignSearchStatus}>
          <Spin size="small" />
          <span>Searching…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className={styles.assignSearchEmpty}>No open assigned invoices found.</div>
      ) : (
        <>
          <div className={styles.assignPickerCount}>
            {totalRows} result{totalRows === 1 ? "" : "s"}
          </div>
          <div className={styles.assignPickerList} role="listbox" aria-label="Assigned invoices">
            {rows.map((assignment) => {
              const invoice = assignment.invoice;
              const license = invoice?.license;
              if (!invoice || !license) return null;

              return (
                <button
                  key={assignment.id}
                  type="button"
                  role="option"
                  className={styles.assignResultItem}
                  onClick={() => handleSelect(assignment)}
                >
                  <div className={styles.assignResultTop}>
                    <span className={styles.assignResultInvoice}>{invoice.invoiceNo}</span>
                    <span className={styles.assignResultAmount}>
                      {formatMmk(invoice.available, invoice.currency)}
                    </span>
                  </div>
                  <div className={styles.assignResultMeta}>
                    {license.licenseCode} · {license.customer?.fullName ?? "Customer"}
                    {license.customer?.township ? ` · ${license.customer.township}` : null}
                  </div>
                  {invoice.available <= 0 ? (
                    <div className={styles.assignResultHeld}>No collectible balance right now</div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {hasMore ? (
            <button
              type="button"
              className={styles.assignLoadMoreBtn}
              disabled={assignmentsQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              {assignmentsQuery.isFetching ? "Loading…" : "Load more"}
            </button>
          ) : null}
        </>
      )}
    </Drawer>
  );
}
