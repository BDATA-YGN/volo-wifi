"use client";

import { useEffect, useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { Input, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { listCollectorInvoiceAssignments } from "../../payments/query";
import type { MobileInvoiceAssignment } from "../../payments/types";
import { formatMmk } from "../../payments/utils";
import AssignedInvoicePickerDrawer from "./AssignedInvoicePickerDrawer";
import styles from "../payments/payments.module.css";

const MIN_SEARCH_LENGTH = 2;
const INLINE_LIMIT = 5;

interface AssignedInvoiceSearchProps {
  onSelect: (assignment: MobileInvoiceAssignment) => void;
  disabled?: boolean;
  licenseId?: string;
}

function AssignmentSummary({
  assignment,
  onChange,
}: {
  assignment: MobileInvoiceAssignment;
  onChange: () => void;
}) {
  const invoice = assignment.invoice;
  const license = invoice?.license;
  if (!invoice || !license) return null;

  return (
    <div className={styles.assignSelectedCard}>
      <div className={styles.assignSelectedTop}>
        <span className={styles.assignSelectedLabel}>Selected invoice</span>
        <button type="button" className={styles.assignChangeBtn} onClick={onChange}>
          Change
        </button>
      </div>
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
    </div>
  );
}

export default function AssignedInvoiceSearch({
  onSelect,
  disabled,
  licenseId,
}: AssignedInvoiceSearchProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<MobileInvoiceAssignment | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const canQuery = debouncedSearch.length >= MIN_SEARCH_LENGTH;

  const assignmentsQuery = useQuery({
    queryKey: mobileQueryKey("collector", [
      "invoice-assignments-inline",
      debouncedSearch,
      licenseId,
    ]),
    queryFn: () =>
      listCollectorInvoiceAssignments({
        search: debouncedSearch,
        status: "open",
        licenseId,
        page: 1,
        limit: INLINE_LIMIT,
      }),
    enabled: !disabled && canQuery && !selected,
  });

  const assignments = assignmentsQuery.data?.data ?? [];
  const totalRows = assignmentsQuery.data?.meta.totalRows ?? 0;
  const showInlineResults =
    !disabled &&
    !selected &&
    focused &&
    canQuery &&
    (assignmentsQuery.isFetching || assignments.length > 0 || assignmentsQuery.isFetched);

  const handleSelect = (assignment: MobileInvoiceAssignment) => {
    setSelected(assignment);
    setSearch("");
    setDebouncedSearch("");
    setFocused(false);
    setPickerOpen(false);
    onSelect(assignment);
  };

  const handleClearSelection = () => {
    setSelected(null);
    setSearch("");
    setDebouncedSearch("");
  };

  if (selected) {
    return (
      <div className={styles.assignSearch}>
        <AssignmentSummary assignment={selected} onChange={handleClearSelection} />
      </div>
    );
  }

  return (
    <div className={styles.assignSearch}>
      <div className={styles.assignSearchHeader}>
        <div className={styles.recentLicenseLabel}>Search assigned invoices</div>
        <button
          type="button"
          className={styles.assignBrowseBtn}
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
        >
          Browse all
        </button>
      </div>

      <Input
        size="large"
        allowClear
        disabled={disabled}
        prefix={<SearchOutlined className={styles.assignSearchIcon} />}
        placeholder="Invoice no., license, customer, township…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          window.setTimeout(() => setFocused(false), 150);
        }}
      />

      <p className={styles.assignSearchHint}>
        Type at least {MIN_SEARCH_LENGTH} characters, or use Browse all for the full list.
      </p>

      {showInlineResults ? (
        assignmentsQuery.isFetching ? (
          <div className={styles.assignSearchStatus}>
            <Spin size="small" />
            <span>Searching…</span>
          </div>
        ) : assignments.length === 0 ? (
          <div className={styles.assignSearchEmpty}>No open assigned invoices found.</div>
        ) : (
          <>
            <div className={styles.assignResultList} role="listbox" aria-label="Assigned invoices">
              {assignments.map((assignment) => {
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
            {totalRows > INLINE_LIMIT ? (
              <button
                type="button"
                className={styles.assignViewAllBtn}
                onClick={() => setPickerOpen(true)}
              >
                View all {totalRows} results
              </button>
            ) : null}
          </>
        )
      ) : null}

      <AssignedInvoicePickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
        licenseId={licenseId}
        initialSearch={search}
      />
    </div>
  );
}
