import { formatMmk } from "../../expenses/utils";
import styles from "./expenses.module.css";

interface ExpenseSummaryStripProps {
  draftCount: number;
  draftAmount: number;
  submittedCount: number;
  submittedAmount: number;
  approvedCount: number;
  approvedAmount: number;
  currency?: string;
}

export default function ExpenseSummaryStrip({
  draftCount,
  draftAmount,
  submittedCount,
  submittedAmount,
  approvedCount,
  approvedAmount,
  currency = "MMK",
}: ExpenseSummaryStripProps) {
  return (
    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Draft</span>
        <span className={styles.summaryValue}>{draftCount}</span>
        <span className={styles.summarySub}>{formatMmk(draftAmount, currency)}</span>
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Submitted</span>
        <span className={styles.summaryValue}>{submittedCount}</span>
        <span className={styles.summarySub}>{formatMmk(submittedAmount, currency)}</span>
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Approved</span>
        <span className={styles.summaryValue}>{approvedCount}</span>
        <span className={styles.summarySub}>{formatMmk(approvedAmount, currency)}</span>
      </div>
    </div>
  );
}
