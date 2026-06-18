import { STATUS_LABELS, STATUS_OPTIONS } from "./constant";
import type { CredentialStatus, SellablePlan } from "./types";

export function formatStatusLabel(status: string): string {
  const known = STATUS_OPTIONS.find((o) => o.value === status)?.label;
  if (known) return known;
  const legacy = STATUS_LABELS[status as CredentialStatus];
  if (legacy) return legacy;
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

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

export function resolvePlanPrice(
  plans: SellablePlan[],
  planId: string,
  stationId: string | undefined
): number | null {
  const plan = plans.find((p) => p.id === planId);
  if (!plan?.hasPricing || plan.unitPrice == null) return null;
  void stationId;
  return plan.unitPrice;
}

export function calcLineTotal(
  unitPrice: number | null,
  quantity: number,
  discount: number
): number | null {
  if (unitPrice == null) return null;
  return Math.max(0, unitPrice * quantity - discount);
}
