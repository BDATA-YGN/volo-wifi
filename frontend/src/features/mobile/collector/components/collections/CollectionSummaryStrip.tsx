import clsx from "clsx";
import { formatMmk, formatMmkCompact } from "../../payments/utils";
import styles from "./collections.module.css";

interface CollectionSummaryStripProps {
  assignedToday: number;
  collectedToday: number;
  overdueCount: number;
  currency?: string;
}

export default function CollectionSummaryStrip({
  assignedToday,
  collectedToday,
  overdueCount,
  currency = "MMK",
}: CollectionSummaryStripProps) {
  return (
    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Today</span>
        <span className={styles.summaryValue}>{assignedToday}</span>
        <span className={styles.summarySub}>Assigned visits</span>
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Collected</span>
        <span
          className={styles.summaryValue}
          title={formatMmk(collectedToday, currency)}
        >
          {formatMmkCompact(collectedToday, currency)}
        </span>
        <span className={styles.summarySub}>Today</span>
      </div>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Overdue</span>
        <span className={clsx(styles.summaryValue, overdueCount > 0 && styles.overdueValue)}>
          {overdueCount}
        </span>
        <span className={styles.summarySub}>Pending visits</span>
      </div>
    </div>
  );
}
