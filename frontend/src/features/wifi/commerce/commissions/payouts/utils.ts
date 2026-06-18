import type { PayoutFormValues, PayoutStatus } from "./types";

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export function formatRuleValue(
  type: "PERCENT" | "FIXED" | null,
  value: number | null,
  currency: string
): string {
  if (!type || value === null) return "—";
  if (type === "PERCENT") return `${Math.round(value * 10000) / 100}%`;
  return formatMoney(value, currency);
}

export function payloadFromForm(values: PayoutFormValues) {
  return {
    resellerId: values.resellerId,
    periodFrom: values.period[0],
    periodTo: values.period[1],
    generate: values.generate,
    amount: values.generate ? undefined : values.amount,
    note: values.note || undefined,
  };
}

export function statusLabel(status: PayoutStatus): string {
  const labels: Record<PayoutStatus, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    PAID: "Paid",
    REJECTED: "Rejected",
  };
  return labels[status];
}
