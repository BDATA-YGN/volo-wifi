import clsx from "clsx";
import type { MobileCustomerPayment } from "../../payments/types";
import {
  formatPaymentAmount,
  formatPaymentDate,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
} from "../../payments/utils";
import styles from "./payments.module.css";

interface PaymentCardProps {
  payment: MobileCustomerPayment;
  onClick: () => void;
}

export default function PaymentCard({ payment, onClick }: PaymentCardProps) {
  const licenseCode = payment.license?.licenseCode ?? "License";
  const paidLabel = formatPaymentDate(payment.paidAt) ?? "—";
  const invoiceCount = payment.allocations.length;

  return (
    <button type="button" className={styles.paymentCard} onClick={onClick}>
      <div className={styles.paymentTop}>
        <div style={{ minWidth: 0 }}>
          <p className={styles.paymentTitle}>{licenseCode}</p>
          <p className={styles.paymentSub}>{paymentMethodLabel(payment.method)}</p>
        </div>
        <div className={styles.paymentAmount}>
          {formatPaymentAmount(payment.amount, payment.currency, true)}
        </div>
      </div>
      <div className={styles.paymentMeta}>
        <span className={clsx(styles.statusBadge, styles[paymentStatusTone(payment.status)])}>
          {paymentStatusLabel(payment.status)}
        </span>
        <span>
          {invoiceCount} invoice{invoiceCount === 1 ? "" : "s"}
        </span>
        <span>{paidLabel}</span>
      </div>
    </button>
  );
}
