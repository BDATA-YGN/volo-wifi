import { formatCurrency } from "@/common/utils/formatCurrency";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  KBZPAY: "KBZ Pay",
  WAVEPAY: "Wave Pay",
  OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending confirm",
  CONFIRMED: "Confirmed",
  VOID: "Void",
};

export function formatMmk(amount: number | null | undefined, currency?: string): string {
  return formatCurrency(amount, currency);
}

export function methodLabel(method: string): string {
  return METHOD_LABELS[method] ?? method.replace(/_/g, " ");
}

export function paymentStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
