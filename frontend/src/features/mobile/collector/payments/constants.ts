import type { MobileStatusMeta } from "@/features/mobile/shared/mobileStatusTones";
import type { SmsPaymentMethod } from "./interface";
import type { PaymentStatusFilter } from "./types";

export const PAYMENT_STATUS_FILTERS: { value: PaymentStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "VOID", label: "Void" },
];

export const PAYMENT_METHOD_OPTIONS: { value: SmsPaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "KBZPAY", label: "KBZ Pay" },
  { value: "WAVEPAY", label: "Wave Pay" },
  { value: "OTHER", label: "Other" },
];

export const PAYMENT_STATUS_META: Record<string, MobileStatusMeta> = {
  PENDING: { tone: "caution", label: "Pending confirm" },
  CONFIRMED: { tone: "success", label: "Confirmed" },
  VOID: { tone: "neutral", label: "Void" },
};
