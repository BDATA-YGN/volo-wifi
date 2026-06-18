import dayjs from "dayjs";
import type { MobilePaymentRecord } from "../../payments/types";
import { formatMmk, methodLabel } from "../../payments/utils";
import PaymentStatusBadge from "./PaymentStatusBadge";
import styles from "./payments.module.css";

interface PaymentCardProps {
  payment: MobilePaymentRecord;
  onClick: () => void;
}

export default function PaymentCard({ payment, onClick }: PaymentCardProps) {
  const customerName = payment.license?.customer?.fullName ?? "Customer";
  const licenseCode = payment.license?.licenseCode ?? "—";
  const paidLabel = payment.paidAt
    ? dayjs(payment.paidAt).format("D MMM YYYY, HH:mm")
    : "—";

  return (
    <button type="button" className={styles.paymentCard} onClick={onClick}>
      <div className={styles.paymentTop}>
        <div style={{ minWidth: 0 }}>
          <p className={styles.paymentTitle}>{customerName}</p>
          <p className={styles.paymentSub}>{licenseCode}</p>
        </div>
        <div className={styles.paymentAmount}>{formatMmk(payment.amount, payment.currency)}</div>
      </div>
      <div className={styles.paymentMeta}>
        <PaymentStatusBadge status={payment.status} />
        <span>{methodLabel(payment.method)}</span>
        <span>{payment.allocations.length} invoice{payment.allocations.length === 1 ? "" : "s"}</span>
        <span>{paidLabel}</span>
      </div>
    </button>
  );
}
