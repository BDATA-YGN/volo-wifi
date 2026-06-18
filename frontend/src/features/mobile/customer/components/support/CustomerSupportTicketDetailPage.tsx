"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import { App, Spin } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import * as TicketApi from "../../support/tickets/query";
import {
  CUSTOMER_TICKET_POLL_MS,
  CUSTOMER_TICKET_STATUS_CLASS,
  CUSTOMER_TICKET_STATUS_LABEL,
} from "../../support/tickets/constants";
import type { CustomerTicketMessage, CustomerSupportTicket } from "../../support/tickets/types";
import styles from "./support.module.css";

interface CustomerSupportTicketDetailPageProps {
  ticketId: string;
}

function messageAuthorLabel(msg: CustomerTicketMessage): string {
  if (msg.authorType === "CUSTOMER") {
    return msg.customer?.fullName ?? "You";
  }
  return msg.admin?.fullName ?? "Support team";
}

function isStaffMessage(msg: CustomerTicketMessage): boolean {
  return msg.authorType === "STAFF";
}

export default function CustomerSupportTicketDetailPage({
  ticketId,
}: CustomerSupportTicketDetailPageProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadSignatureRef = useRef<string | null>(null);

  const ticketQueryKey = mobileQueryKey("customer", ["support-ticket", ticketId]);

  const ticketQuery = useQuery({
    queryKey: ticketQueryKey,
    queryFn: () => TicketApi.getCustomerSupportTicket(ticketId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "CLOSED" ? false : CUSTOMER_TICKET_POLL_MS;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const ticket = ticketQuery.data;
  const isClosed = ticket?.status === "CLOSED";
  const statusClass = ticket ? styles[CUSTOMER_TICKET_STATUS_CLASS[ticket.status]] : null;

  const threadSignature = useMemo(() => {
    if (!ticket) return "";
    const msgs = ticket.messages ?? [];
    const last = msgs.at(-1);
    return [
      ticket.status,
      ticket.updatedAt ?? "",
      msgs.length,
      last?.id ?? "",
      last?.createdAt ?? "",
    ].join("|");
  }, [ticket]);

  useEffect(() => {
    if (!threadSignature) return;
    const isNewActivity =
      threadSignatureRef.current !== null && threadSignatureRef.current !== threadSignature;
    threadSignatureRef.current = threadSignature;

    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({
      behavior: isNewActivity ? "smooth" : "auto",
      block: "end",
    });
  }, [threadSignature]);

  const syncRelatedQueries = () => {
    void queryClient.invalidateQueries({ queryKey: mobileQueryKey("customer", ["support-tickets"]) });
    void queryClient.invalidateQueries({ queryKey: mobileQueryKey("customer", ["home"]) });
  };

  const applyTicketUpdate = (updated: CustomerSupportTicket) => {
    queryClient.setQueryData(ticketQueryKey, updated);
    syncRelatedQueries();
  };

  const handleReply = async () => {
    if (!replyBody.trim()) {
      message.warning("Enter your message.");
      return;
    }
    setSubmitting(true);
    const result = await TicketApi.safeReplyCustomerSupportTicket(ticketId, replyBody.trim());
    setSubmitting(false);

    if (!result.success || !result.data) {
      message.error(result.error?.message ?? "Could not send reply.");
      return;
    }

    setReplyBody("");
    applyTicketUpdate(result.data);
    message.success("Reply sent.");
  };

  if (ticketQuery.isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading ticket…</span>
      </div>
    );
  }

  if (ticketQuery.isError || !ticket) {
    return (
      <div className={styles.page}>
        <Link href={MOBILE_ROUTES.customer.support} className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden />
          Back to support
        </Link>
        <div className={styles.errorWrap}>
          Ticket not found.
          <button
            type="button"
            className={styles.btnPrimary}
            style={{ marginTop: "0.75rem" }}
            onClick={() => void ticketQuery.refetch()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const messages = ticket.messages ?? [];

  return (
    <div className={styles.page}>
      <Link href={MOBILE_ROUTES.customer.support} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        Back to support
      </Link>

      <section className={styles.detailHero} aria-label="Ticket summary">
        <div className={styles.detailHeroTop}>
          <span className={styles.ticketNo}>{ticket.ticketNo}</span>
          {!isClosed ? <span className={styles.liveBadge}>Live</span> : null}
        </div>
        <h1 className={styles.detailSubject}>{ticket.subject}</h1>
        <p className={styles.detailMeta}>
          {statusClass ? (
            <span className={clsx(statusClass, styles.heroStatusBadge)} style={{ marginRight: "0.5rem" }}>
              {CUSTOMER_TICKET_STATUS_LABEL[ticket.status]}
            </span>
          ) : null}
          {ticket.license?.licenseCode ? `${ticket.license.licenseCode} · ` : ""}
          {ticket.createdAt ? dayjs(ticket.createdAt).format("D MMM YYYY, HH:mm") : ""}
        </p>
        {ticket.status === "WAITING_CUSTOMER" ? (
          <p className={styles.awaitingHint}>The support team is waiting for your reply.</p>
        ) : null}
      </section>

      <section className={styles.messageList} aria-label="Conversation">
        {messages.length === 0 && ticket.description ? (
          <div className={`${styles.messageBubble} ${styles.messageBubbleCustomer}`}>
            <div className={styles.messageAuthor}>You</div>
            <div className={styles.messageBody}>{ticket.description}</div>
          </div>
        ) : null}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageBubble} ${isStaffMessage(msg) ? styles.messageBubbleStaff : styles.messageBubbleCustomer}`}
          >
            <div className={styles.messageAuthor}>{messageAuthorLabel(msg)}</div>
            <div className={styles.messageBody}>{msg.body}</div>
            {msg.createdAt ? (
              <div className={styles.messageTime}>{dayjs(msg.createdAt).format("D MMM, HH:mm")}</div>
            ) : null}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </section>

      {isClosed ? (
        <p className={styles.closedNote}>This ticket is closed. Open a new ticket if you need more help.</p>
      ) : (
        <div className={styles.replyBox}>
          <textarea
            className={styles.textarea}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write your reply…"
            rows={3}
          />
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={submitting}
            onClick={() => void handleReply()}
          >
            {submitting ? "Sending…" : "Send reply"}
          </button>
        </div>
      )}
    </div>
  );
}
