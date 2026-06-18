import Link from "next/link";
import dayjs from "dayjs";
import type { ExpenseClaimRecord } from "../../expenses/interface";
import { formatMmk } from "../../expenses/utils";
import ExpenseStatusBadge from "./ExpenseStatusBadge";
import styles from "./expenses.module.css";

interface ExpenseClaimCardProps {
  claim: ExpenseClaimRecord;
}

export default function ExpenseClaimCard({ claim }: ExpenseClaimCardProps) {
  const title = claim.title?.trim() || "Untitled claim";
  const createdLabel = claim.createdAt
    ? dayjs(claim.createdAt).format("D MMM YYYY")
    : "—";

  return (
    <Link href={`/collector/expenses/${claim.id}`} className={styles.claimCard}>
      <div className={styles.claimTop}>
        <div style={{ minWidth: 0 }}>
          <h3 className={styles.claimTitle}>{title}</h3>
        </div>
        <div className={styles.claimAmount}>{formatMmk(claim.totalAmount, claim.currency)}</div>
      </div>
      <div className={styles.claimMeta}>
        <ExpenseStatusBadge status={claim.status} />
        <span>{claim.lineCount} line{claim.lineCount === 1 ? "" : "s"}</span>
        <span>{createdLabel}</span>
      </div>
    </Link>
  );
}
