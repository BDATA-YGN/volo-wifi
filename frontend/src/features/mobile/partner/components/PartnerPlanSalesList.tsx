import { formatMoney } from "@/features/wifi/commerce/partners/workspace/utils";
import styles from "./partner.module.css";

export type PartnerPlanSalesRow = {
  planId: string;
  planCode: string;
  planName: string;
  tokenCount: number;
  amount: number;
};

type Props = {
  rows: PartnerPlanSalesRow[];
  currency: string;
  emptyText: string;
  showHeader?: boolean;
};

export default function PartnerPlanSalesList({
  rows,
  currency,
  emptyText,
  showHeader = false,
}: Props) {
  if (rows.length === 0) {
    return (
      <div className={styles.planSalesCard}>
        <p className={styles.planSalesEmpty}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={styles.planSalesCard}>
      {showHeader ? (
        <div className={styles.planSalesHeader}>
          <span>Plan</span>
          <span>Tokens / sales</span>
        </div>
      ) : null}
      {rows.map((row) => (
        <div key={row.planId} className={styles.planSalesRow}>
          <div>
            <p className={styles.planSalesName}>{row.planName}</p>
            <p className={styles.planSalesQty}>
              {row.tokenCount} token{row.tokenCount === 1 ? "" : "s"}
            </p>
          </div>
          <p className={styles.planSalesAmount}>{formatMoney(row.amount, currency)}</p>
        </div>
      ))}
    </div>
  );
}
