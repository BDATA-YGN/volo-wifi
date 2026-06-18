import dayjs from "dayjs";
import { ExternalLink, FileText } from "lucide-react";
import type { ExpenseLineRecord } from "../../expenses/interface";
import {
  expenseReceiptDisplayUrl,
  expenseReceiptIsPdf,
} from "./ExpenseReceiptUpload";
import { formatMmk } from "../../expenses/utils";
import styles from "./expenses.module.css";

interface ExpenseLineCardProps {
  line: ExpenseLineRecord;
  currency?: string;
}

export default function ExpenseLineCard({ line, currency = "MMK" }: ExpenseLineCardProps) {
  const title = line.title?.trim() || line.accountCode?.name || "Expense line";
  const codeLabel = line.accountCode
    ? `${line.accountCode.code} — ${line.accountCode.name}`
    : "—";
  const occurredLabel = line.occurredAt
    ? dayjs(line.occurredAt).format("D MMM YYYY, HH:mm")
    : null;
  const receiptUrl = expenseReceiptDisplayUrl(line.receiptUrl);
  const isPdf = expenseReceiptIsPdf(line.receiptUrl);

  return (
    <article className={styles.lineCard}>
      <div className={styles.lineTop}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.lineTitle}>{title}</div>
          <div className={styles.lineCode}>{codeLabel}</div>
        </div>
        <div className={styles.lineAmount}>{formatMmk(line.amount, currency)}</div>
      </div>

      {occurredLabel ? <div className={styles.lineMeta}>{occurredLabel}</div> : null}
      {line.note?.trim() ? (
        <div className={styles.lineMeta} style={{ marginTop: "0.25rem" }}>
          {line.note}
        </div>
      ) : null}

      {receiptUrl ? (
        <a
          href={receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.receiptLink}
        >
          {isPdf ? <FileText size={14} aria-hidden /> : <ExternalLink size={14} aria-hidden />}
          {isPdf ? "View receipt PDF" : "View receipt"}
        </a>
      ) : null}
    </article>
  );
}
