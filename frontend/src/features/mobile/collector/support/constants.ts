import type { MobileStatusMeta } from "@/features/mobile/shared/mobileStatusTones";
import type { SupportTicketCategory, SupportTicketPriority, SupportTicketStatusValue } from "./types";

export const SUPPORT_SCOPE_FILTERS = [
  { value: "mine" as const, label: "My tickets" },
  { value: "queue" as const, label: "Unassigned" },
  { value: "all" as const, label: "All" },
];

export const SUPPORT_STATUS_META: Record<SupportTicketStatusValue, MobileStatusMeta> = {
  OPEN: { tone: "info", label: "Open" },
  IN_PROGRESS: { tone: "highlight", label: "In progress" },
  WAITING_CUSTOMER: { tone: "caution", label: "Waiting customer" },
  RESOLVED: { tone: "success", label: "Resolved" },
  CLOSED: { tone: "neutral", label: "Closed" },
};

export const SUPPORT_PRIORITY_META: Record<SupportTicketPriority, MobileStatusMeta> = {
  LOW: { tone: "neutral", label: "Low" },
  NORMAL: { tone: "info", label: "Normal" },
  HIGH: { tone: "caution", label: "High" },
  URGENT: { tone: "danger", label: "Urgent" },
};

export const SUPPORT_CATEGORY_OPTIONS: { value: SupportTicketCategory; label: string }[] = [
  { value: "BILLING", label: "Billing" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "CONNECTIVITY", label: "Connectivity" },
  { value: "ACCOUNT", label: "Account" },
  { value: "OTHER", label: "Other" },
];

export const SUPPORT_PRIORITY_OPTIONS: { value: SupportTicketPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export const SUPPORT_RESOLVE_STATUSES: { value: SupportTicketStatusValue; label: string }[] = [
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_CUSTOMER", label: "Waiting on customer" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

export const CONTENT_TYPE_LABEL: Record<string, string> = {
  NOTICE: "Notice",
  GUIDE: "Guide",
  POLICY: "Policy",
};

/** Poll open ticket detail while the page is visible (ms). */
export const SUPPORT_TICKET_POLL_MS = 5_000;
