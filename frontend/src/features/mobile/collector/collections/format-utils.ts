import { formatCurrency } from "@/common/utils/formatCurrency";

const RESULT_LABELS: Record<string, string> = {
  PENDING: "Pending",
  COLLECTED: "Collected",
  PARTIAL: "Partial",
  FAILED: "Failed",
  SKIPPED: "Skipped",
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  KBZPAY: "KBZ Pay",
  WAVEPAY: "Wave Pay",
  OTHER: "Other",
};

export function formatMmk(amount: number | null | undefined, currency?: string): string {
  return formatCurrency(amount, currency);
}

export function collectionResultLabel(result: string): string {
  return RESULT_LABELS[result] ?? result.replace(/_/g, " ");
}

export function methodLabel(method: string): string {
  return METHOD_LABELS[method] ?? method.replace(/_/g, " ");
}

export function isVisitOverdue(
  scheduledAt: string | null | undefined,
  result: string,
): boolean {
  if (result !== "PENDING" || !scheduledAt) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(scheduledAt) < startOfToday;
}
