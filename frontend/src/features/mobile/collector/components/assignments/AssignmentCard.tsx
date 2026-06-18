"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { useState } from "react";
import { App } from "antd";
import { resolveCurrencyCode } from "@/common/utils/formatCurrency";
import type { MobileInvoiceAssignment } from "../../payments/types";
import { formatMmk } from "../../payments/utils";
import { ASSIGNMENT_STATUS_META } from "../../assignments/constants";
import MobileStatusBadge from "@/features/mobile/shared/components/MobileStatusBadge";
import * as AssignmentApi from "../../assignments/query";
import styles from "./assignments.module.css";

interface AssignmentCardProps {
  assignment: MobileInvoiceAssignment;
  onAccepted?: () => void;
}

export default function AssignmentCard({ assignment, onAccepted }: AssignmentCardProps) {
  const { message } = App.useApp();
  const [accepting, setAccepting] = useState(false);
  const inv = assignment.invoice;
  const license = inv?.license;
  const customer = license?.customer;
  const statusMeta = ASSIGNMENT_STATUS_META[assignment.status] ?? ASSIGNMENT_STATUS_META.ASSIGNED;
  const currency = resolveCurrencyCode(inv?.currency);
  const isOverdue = assignment.dueAt && dayjs(assignment.dueAt).isBefore(dayjs(), "day");

  const handleAccept = async () => {
    setAccepting(true);
    const result = await AssignmentApi.safeAcceptCollectorAssignment(assignment.id);
    setAccepting(false);
    if (!result.success) {
      message.error(result.error?.message ?? "Could not accept assignment.");
      return;
    }
    message.success("Assignment accepted.");
    onAccepted?.();
  };

  const payHref = license
    ? `/collector/payments?licenseId=${encodeURIComponent(license.id)}`
    : "/collector/payments";

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.invoiceNo}>{inv?.invoiceNo ?? "Invoice"}</span>
        <MobileStatusBadge meta={statusMeta} />
      </div>

      {customer ? (
        <p className={styles.customerLine}>
          {customer.fullName}
          {customer.township ? ` · ${customer.township}` : ""}
        </p>
      ) : null}

      {license ? (
        <p className={styles.licenseLine}>License {license.licenseCode}</p>
      ) : null}

      {assignment.note ? (
        <p className={styles.licenseLine} style={{ fontStyle: "italic" }}>
          {assignment.note}
        </p>
      ) : null}

      <div className={styles.amountRow}>
        <span className={styles.amountLabel}>
          Collectible
          {assignment.dueAt ? (
            <span className={isOverdue ? styles.overdueText : undefined}>
              {" "}
              · due {dayjs(assignment.dueAt).format("D MMM")}
            </span>
          ) : null}
        </span>
        <span className={styles.amountValue}>
          {formatMmk(inv?.available ?? inv?.balanceDue ?? 0, currency)}
        </span>
      </div>

      <div className={styles.cardActions}>
        {assignment.status === "ASSIGNED" ? (
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={accepting}
            onClick={() => void handleAccept()}
          >
            {accepting ? "Accepting…" : "Accept"}
          </button>
        ) : null}
        <Link href={payHref} className={styles.btnSecondary}>
          Record payment
        </Link>
      </div>
    </article>
  );
}
