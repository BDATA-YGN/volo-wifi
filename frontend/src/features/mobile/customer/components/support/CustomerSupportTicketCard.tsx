"use client";

import Link from "next/link";
import clsx from "clsx";
import dayjs from "dayjs";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import {
  CUSTOMER_TICKET_STATUS_CLASS,
  CUSTOMER_TICKET_STATUS_LABEL,
} from "../../support/tickets/constants";
import type { CustomerSupportTicket } from "../../support/tickets/types";
import styles from "./support.module.css";

interface CustomerSupportTicketCardProps {
  ticket: CustomerSupportTicket;
}

export default function CustomerSupportTicketCard({ ticket }: CustomerSupportTicketCardProps) {
  const statusClass = styles[CUSTOMER_TICKET_STATUS_CLASS[ticket.status]];

  return (
    <Link
      href={`${MOBILE_ROUTES.customer.support}/${ticket.id}`}
      className={styles.ticketCard}
    >
      <div className={styles.ticketTop}>
        <span className={styles.ticketNo}>{ticket.ticketNo}</span>
        <span className={clsx(statusClass)}>{CUSTOMER_TICKET_STATUS_LABEL[ticket.status]}</span>
      </div>
      <h3 className={styles.ticketSubject}>{ticket.subject}</h3>
      <p className={styles.ticketMeta}>
        {ticket.license?.licenseCode ? `${ticket.license.licenseCode} · ` : ""}
        {ticket.createdAt ? dayjs(ticket.createdAt).format("D MMM YYYY") : ""}
        {ticket.assignedToAdmin?.fullName ? ` · ${ticket.assignedToAdmin.fullName}` : ""}
      </p>
      <div className={styles.badgeRow}>
        <span className={styles.categoryBadge}>{ticket.category.replace(/_/g, " ")}</span>
        {ticket.status === "WAITING_CUSTOMER" ? (
          <span className={styles.metaBadgeAttention}>Your reply needed</span>
        ) : null}
        {ticket.messageCount > 0 ? (
          <span className={styles.metaBadgeNeutral}>
            {ticket.messageCount} msg{ticket.messageCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
