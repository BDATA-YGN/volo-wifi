import { PERSONA_LABELS } from "./constant";

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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatPersona(persona: string): string {
  return PERSONA_LABELS[persona] ?? persona.replace(/_/g, " ");
}

export function formatSessionStatus(status: string): string {
  const map: Record<string, string> = {
    START: "Started",
    INTERIM: "Interim",
    STOP: "Stopped",
  };
  return map[status] ?? status;
}
