"use client";

import { useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { ArrowLeft, Plus, Send } from "lucide-react";
import { App, Spin } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ExpenseApi from "../../expenses/query";
import {
  canEditClaim,
  canSubmitClaim,
  formatMmk,
} from "../../expenses/utils";
import AddExpenseLineDrawer from "./AddExpenseLineDrawer";
import ExpenseLineCard from "./ExpenseLineCard";
import ExpenseStatusBadge from "./ExpenseStatusBadge";
import styles from "./expenses.module.css";

interface CollectorExpenseDetailPageProps {
  claimId: string;
}

export default function CollectorExpenseDetailPage({ claimId }: CollectorExpenseDetailPageProps) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [lineDrawerOpen, setLineDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const claimQuery = useQuery({
    queryKey: ["mobile-collector-expense", claimId],
    queryFn: () => ExpenseApi.getCollectorExpense(claimId),
  });

  const codesQuery = useQuery({
    queryKey: ["mobile-collector-account-codes"],
    queryFn: () => ExpenseApi.listCollectorAccountCodes(),
    enabled: lineDrawerOpen,
  });

  const claim = claimQuery.data;
  const isDraft = claim ? canEditClaim(claim.status) : false;
  const canSubmit = claim ? canSubmitClaim(claim.status) && (claim.lines?.length ?? 0) > 0 : false;

  const refreshClaim = async () => {
    await queryClient.invalidateQueries({ queryKey: ["mobile-collector-expense", claimId] });
    await queryClient.invalidateQueries({ queryKey: ["mobile-collector-expenses"] });
    await queryClient.invalidateQueries({ queryKey: ["mobile-collector-expenses-summary"] });
  };

  const handleSubmit = () => {
    if (!claim) return;

    modal.confirm({
      title: "Submit for approval?",
      content:
        "Finance will review this claim after submission. You cannot edit lines once submitted.",
      okText: "Submit",
      cancelText: "Cancel",
      onOk: async () => {
        setSubmitting(true);
        try {
          const result = await ExpenseApi.safeSubmitCollectorExpense(claimId);
          if (!result.success) {
            throw new Error(result.error?.message ?? "Submit failed");
          }
          message.success("Expense claim submitted");
          await refreshClaim();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Submit failed");
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  if (claimQuery.isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading claim…</span>
      </div>
    );
  }

  if (claimQuery.isError || !claim) {
    return (
      <div className={styles.page}>
        <Link href="/collector/expenses" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden />
          Back to expenses
        </Link>
        <div className={styles.errorWrap}>
          Expense claim not found.
          <button type="button" className={styles.retryBtn} onClick={() => void claimQuery.refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const title = claim.title?.trim() || "Untitled claim";
  const lines = claim.lines ?? [];

  return (
    <div className={styles.page} style={{ paddingBottom: isDraft ? "5.5rem" : "1rem" }}>
      <Link href="/collector/expenses" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        Back to expenses
      </Link>

      <header className={styles.detailHeader}>
        <div style={{ marginBottom: "0.5rem" }}>
          <ExpenseStatusBadge status={claim.status} />
        </div>
        <h1 className={styles.detailTitle}>{title}</h1>
        {claim.note?.trim() ? <p className={styles.detailNote}>{claim.note}</p> : null}
        <div className={styles.detailStats}>
          <div className={styles.detailStat}>
            <strong>{formatMmk(claim.totalAmount, claim.currency)}</strong>
            Total
          </div>
          <div className={styles.detailStat}>
            <strong>{lines.length}</strong>
            Line{lines.length === 1 ? "" : "s"}
          </div>
          {claim.createdAt ? (
            <div className={styles.detailStat}>
              <strong>{dayjs(claim.createdAt).format("D MMM")}</strong>
              Created
            </div>
          ) : null}
        </div>
      </header>

      {claim.status === "SUBMITTED" && claim.submittedAt ? (
        <div className={styles.sectionCard}>
          <div className={styles.approvalBox}>
            Submitted on <strong>{dayjs(claim.submittedAt).format("D MMM YYYY, HH:mm")}</strong>.
            Waiting for finance approval.
          </div>
        </div>
      ) : null}

      {(claim.status === "APPROVED" || claim.status === "REJECTED" || claim.status === "PAID") &&
      (claim.approvedAt || claim.approvalNote) ? (
        <div className={styles.sectionCard}>
          <div className={styles.approvalBox}>
            {claim.approvedAt ? (
              <div>
                {claim.status === "REJECTED" ? "Reviewed" : "Approved"} on{" "}
                <strong>{dayjs(claim.approvedAt).format("D MMM YYYY, HH:mm")}</strong>
              </div>
            ) : null}
            {claim.approvalNote?.trim() ? (
              <div style={{ marginTop: "0.375rem" }}>Note: {claim.approvalNote}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className={styles.sectionCard}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Expense lines</h2>
          {isDraft ? (
            <button
              type="button"
              className={styles.actionSecondary}
              style={{ padding: "0.375rem 0.75rem", flex: "none" }}
              onClick={() => setLineDrawerOpen(true)}
            >
              <Plus size={16} aria-hidden />
              Add
            </button>
          ) : null}
        </div>

        {lines.length === 0 ? (
          <div className={styles.emptyState} style={{ border: "none", borderRadius: 0 }}>
            <p className={styles.emptyDesc}>
              {isDraft
                ? "Add at least one line with an account code and amount before submitting."
                : "No lines on this claim."}
            </p>
          </div>
        ) : (
          lines.map((line) => (
            <ExpenseLineCard key={line.id} line={line} currency={claim.currency} />
          ))
        )}
      </section>

      {isDraft ? (
        <div className={styles.stickyActions}>
          <button
            type="button"
            className={styles.actionSecondary}
            onClick={() => setLineDrawerOpen(true)}
          >
            <Plus size={18} aria-hidden />
            Add line
          </button>
          <button
            type="button"
            className={styles.actionPrimary}
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            <Send size={18} aria-hidden />
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      ) : null}

      <AddExpenseLineDrawer
        open={lineDrawerOpen}
        claimId={claimId}
        accountCodes={codesQuery.data ?? []}
        loadingCodes={codesQuery.isLoading}
        onClose={() => setLineDrawerOpen(false)}
        onAdded={() => void refreshClaim()}
      />
    </div>
  );
}
