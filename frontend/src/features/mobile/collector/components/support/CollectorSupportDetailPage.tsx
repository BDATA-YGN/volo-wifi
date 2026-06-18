"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { ArrowLeft } from "lucide-react";
import { App, Select, Spin } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import * as SupportApi from "../../support/query";
import {
  SUPPORT_PRIORITY_META,
  SUPPORT_RESOLVE_STATUSES,
  SUPPORT_STATUS_META,
  SUPPORT_TICKET_POLL_MS,
} from "../../support/constants";
import MobileStatusBadge from "@/features/mobile/shared/components/MobileStatusBadge";
import type { SupportTicketMessage, SupportTicketRecord, SupportTicketStatusValue } from "../../support/types";
import styles from "./support.module.css";

interface CollectorSupportDetailPageProps {
  ticketId: string;
}

function messageAuthorLabel(
  msg: SupportTicketMessage,
  ticket: SupportTicketRecord,
): string {
  if (msg.authorType === "CUSTOMER") {
    return msg.customer?.fullName ?? ticket.customer?.fullName ?? "Customer";
  }
  return msg.admin?.fullName ?? "Staff";
}

function isCustomerMessage(msg: SupportTicketMessage): boolean {
  return msg.authorType === "CUSTOMER";
}

export default function CollectorSupportDetailPage({ ticketId }: CollectorSupportDetailPageProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [replyBody, setReplyBody] = useState("");
  const [replyStatus, setReplyStatus] = useState<SupportTicketStatusValue | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadSignatureRef = useRef<string | null>(null);

  const ticketQueryKey = mobileQueryKey("collector", ["support-ticket", ticketId]);

  const ticketQuery = useQuery({
    queryKey: ticketQueryKey,
    queryFn: () => SupportApi.getCollectorSupportTicket(ticketId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "CLOSED" ? false : SUPPORT_TICKET_POLL_MS;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const ticket = ticketQuery.data;
  const isClosed = ticket?.status === "CLOSED";

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
    const isNewActivity = threadSignatureRef.current !== null && threadSignatureRef.current !== threadSignature;
    threadSignatureRef.current = threadSignature;

    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({
      behavior: isNewActivity ? "smooth" : "auto",
      block: "end",
    });
  }, [threadSignature]);

  const syncRelatedQueries = () => {
    void queryClient.invalidateQueries({ queryKey: mobileQueryKey("collector", ["support"]) });
    void queryClient.invalidateQueries({ queryKey: mobileQueryKey("collector", ["home"]) });
  };

  const applyTicketUpdate = (updated: SupportTicketRecord) => {
    queryClient.setQueryData(ticketQueryKey, updated);
    syncRelatedQueries();
  };

  const handleAssignSelf = async () => {
    setAssigning(true);
    try {
      const updated = await SupportApi.assignSelfSupportTicket(ticketId);
      applyTicketUpdate(updated);
      message.success("Ticket assigned to you.");
    } catch {
      message.error("Could not take this ticket.");
    } finally {
      setAssigning(false);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim()) {
      message.warning("Enter a reply.");
      return;
    }
    setSubmitting(true);
    const result = await SupportApi.safeReplySupportTicket(ticketId, {
      body: replyBody.trim(),
      status: replyStatus || undefined,
    });
    setSubmitting(false);
    if (!result.success || !result.data) {
      message.error(result.error?.message ?? "Could not send reply.");
      return;
    }
    applyTicketUpdate(result.data);
    message.success("Reply sent.");
    setReplyBody("");
    setReplyStatus("");
  };

  const handleStatusOnly = async (status: SupportTicketStatusValue) => {
    setSubmitting(true);
    try {
      const updated = await SupportApi.setSupportTicketStatus(ticketId, status);
      applyTicketUpdate(updated);
      message.success("Status updated.");
    } catch {
      message.error("Could not update status.");
    } finally {
      setSubmitting(false);
    }
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
        <Link href="/collector/support" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden />
          Back to support
        </Link>
        <div className={styles.errorWrap}>Support ticket not found.</div>
      </div>
    );
  }

  const statusMeta = SUPPORT_STATUS_META[ticket.status];
  const priorityMeta = SUPPORT_PRIORITY_META[ticket.priority];
  const isRefreshing = ticketQuery.isFetching && !ticketQuery.isLoading;

  return (
    <div className={styles.page}>
      <Link href="/collector/support" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        Back to support
      </Link>

      <section className={styles.detailHero}>
        <div className={styles.detailHeroTop}>
          <span style={{ fontSize: "0.75rem", opacity: 0.85 }}>{ticket.ticketNo}</span>
          {isRefreshing ? (
            <span className={styles.liveBadge} aria-live="polite">
              Updating…
            </span>
          ) : !isClosed ? (
            <span className={styles.liveBadge} aria-hidden>
              Live
            </span>
          ) : null}
        </div>
        <h1 className={styles.detailSubject}>{ticket.subject}</h1>
        <p className={styles.detailMeta}>
          {ticket.customer?.fullName ?? "Customer"}
          {ticket.license?.licenseCode ? ` · ${ticket.license.licenseCode}` : ""}
        </p>
        <div className={styles.badgeRow} style={{ marginTop: "0.625rem" }}>
          <MobileStatusBadge meta={statusMeta} />
          <MobileStatusBadge meta={priorityMeta} />
        </div>
      </section>

      {!ticket.assignedToAdminId ? (
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={assigning}
          onClick={() => void handleAssignSelf()}
        >
          {assigning ? "Assigning…" : "Take this ticket"}
        </button>
      ) : null}

      {ticket.description ? (
        <div className={styles.messageBubble}>
          <div className={styles.messageAuthor}>Initial report</div>
          <div className={styles.messageBody}>{ticket.description}</div>
        </div>
      ) : null}

      <div className={styles.messageList}>
        {(ticket.messages ?? []).map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageBubble} ${
              isCustomerMessage(msg) ? styles.messageBubbleCustomer : styles.messageBubbleStaff
            }`}
          >
            <div className={styles.messageAuthor}>{messageAuthorLabel(msg, ticket)}</div>
            <div className={styles.messageBody}>{msg.body}</div>
            {msg.createdAt ? (
              <div className={styles.messageTime}>{dayjs(msg.createdAt).format("D MMM YYYY, h:mm A")}</div>
            ) : null}
          </div>
        ))}
        <div ref={messagesEndRef} aria-hidden />
      </div>

      {!isClosed ? (
        <div className={styles.replyBox}>
          <textarea
            className={styles.textarea}
            placeholder="Write a reply to the customer…"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
          />
          <div className={styles.actionRow}>
            <Select
              allowClear
              placeholder="Set status (optional)"
              style={{ flex: 1 }}
              value={replyStatus || undefined}
              onChange={(v) => setReplyStatus(v ?? "")}
              options={SUPPORT_RESOLVE_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            />
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={submitting}
              onClick={() => void handleReply()}
            >
              {submitting ? "Sending…" : "Send"}
            </button>
          </div>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.btnSecondary}
              disabled={submitting}
              onClick={() => void handleStatusOnly("RESOLVED")}
            >
              Mark resolved
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              disabled={submitting}
              onClick={() => void handleStatusOnly("CLOSED")}
            >
              Close ticket
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
