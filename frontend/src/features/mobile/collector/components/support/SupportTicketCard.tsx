"use client";

import Link from "next/link";
import dayjs from "dayjs";
import type { SupportTicketRecord } from "../../support/types";
import {
  SUPPORT_PRIORITY_META,
  SUPPORT_STATUS_META,
} from "../../support/constants";
import MobileStatusBadge from "@/features/mobile/shared/components/MobileStatusBadge";
import styles from "./support.module.css";

interface SupportTicketCardProps {
  ticket: SupportTicketRecord;
}

export default function SupportTicketCard({ ticket }: SupportTicketCardProps) {
  const statusMeta = SUPPORT_STATUS_META[ticket.status];
  const priorityMeta = SUPPORT_PRIORITY_META[ticket.priority];

  return (
    <Link href={`/collector/support/${ticket.id}`} className={styles.ticketCard}>
      <div className={styles.ticketTop}>
        <span className={styles.ticketNo}>{ticket.ticketNo}</span>
        <MobileStatusBadge meta={statusMeta} />
      </div>
      <h3 className={styles.ticketSubject}>{ticket.subject}</h3>
      <p className={styles.ticketMeta}>
        {ticket.customer?.fullName ?? "Customer"}
        {ticket.license?.licenseCode ? ` · ${ticket.license.licenseCode}` : ""}
        {ticket.createdAt ? ` · ${dayjs(ticket.createdAt).format("D MMM")}` : ""}
      </p>
      <div className={styles.badgeRow}>
        <MobileStatusBadge meta={priorityMeta} />
        {!ticket.assignedToAdminId ? (
          <MobileStatusBadge meta={{ tone: "caution", label: "Unassigned" }} />
        ) : null}
        {ticket.messageCount > 0 ? (
          <MobileStatusBadge
            meta={{
              tone: "neutral",
              label: `${ticket.messageCount} msg${ticket.messageCount === 1 ? "" : "s"}`,
            }}
          />
        ) : null}
      </div>
    </Link>
  );
}
