import type { CustomerTicketCategory, CustomerTicketStatusValue } from "./types";

export const CUSTOMER_TICKET_STATUS_LABEL: Record<CustomerTicketStatusValue, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_CUSTOMER: "Awaiting you",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

/** CSS module class keys in support.module.css */
export const CUSTOMER_TICKET_STATUS_CLASS: Record<CustomerTicketStatusValue, string> = {
  OPEN: "ticketStatusOpen",
  IN_PROGRESS: "ticketStatusInProgress",
  WAITING_CUSTOMER: "ticketStatusWaiting",
  RESOLVED: "ticketStatusResolved",
  CLOSED: "ticketStatusClosed",
};

export const CUSTOMER_TICKET_STATUS_FILTERS = [
  { value: "active" as const, label: "Active" },
  { value: "all" as const, label: "All" },
  { value: "OPEN" as const, label: "Open" },
  { value: "WAITING_CUSTOMER" as const, label: "Awaiting you" },
  { value: "RESOLVED" as const, label: "Resolved" },
  { value: "CLOSED" as const, label: "Closed" },
];

export const CUSTOMER_TICKET_CATEGORY_OPTIONS: { value: CustomerTicketCategory; label: string }[] =
  [
    { value: "BILLING", label: "Billing" },
    { value: "TECHNICAL", label: "Technical" },
    { value: "CONNECTIVITY", label: "Connectivity" },
    { value: "ACCOUNT", label: "Account" },
    { value: "OTHER", label: "Other" },
  ];

/** Poll open ticket detail while the page is visible (ms). */
export const CUSTOMER_TICKET_POLL_MS = 5_000;
