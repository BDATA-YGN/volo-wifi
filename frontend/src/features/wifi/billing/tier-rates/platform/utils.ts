import { formatWifiDate, formatWifiDateTime } from "@/features/wifi/shared/format";

export function formatMoney(amount: string | number, currency: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return `— ${currency}`;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value) + ` ${currency}`;
}

export function formatDate(value: string | null | undefined): string {
  return formatWifiDate(value);
}

export function formatDateTime(value: string | null | undefined): string {
  return formatWifiDateTime(value);
}
