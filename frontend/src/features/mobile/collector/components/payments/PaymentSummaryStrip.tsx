import { formatMmk } from "../../payments/utils";
import styles from "./payments.module.css";

interface PaymentSummaryStripProps {
  pendingCount: number;
  pendingAmount: number;
  confirmedCount: number;
  confirmedAmount: number;
  totalCount: number;
  currency?: string;
}

export default function PaymentSummaryStrip({
  pendingCount,
  pendingAmount,
  confirmedCount,
  confirmedAmount,
  totalCount,
  currency = "MMK",
}: PaymentSummaryStripProps) {
  return (
    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Recorded</span>
        <span className={styles.summaryValue}>{totalCount}</span>
        <span className={styles.summarySub}>All payments</span>
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Pending</span>
        <span className={styles.summaryValue}>{pendingCount}</span>
        <span className={styles.summarySub}>{formatMmk(pendingAmount, currency)}</span>
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Confirmed</span>
        <span className={styles.summaryValue}>{confirmedCount}</span>
        <span className={styles.summarySub}>{formatMmk(confirmedAmount, currency)}</span>
      </div>
    </div>
  );
}
