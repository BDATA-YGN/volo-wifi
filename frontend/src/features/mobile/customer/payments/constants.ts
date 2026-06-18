import type { PaymentStatusFilter } from "./types";

export const PAYMENT_STATUS_FILTERS: { value: PaymentStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING", label: "Pending" },
  { value: "VOID", label: "Void" },
];

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending confirm",
  CONFIRMED: "Confirmed",
  VOID: "Void",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  KBZPAY: "KBZ Pay",
  WAVEPAY: "Wave Pay",
  OTHER: "Other",
};
