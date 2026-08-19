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

export function formatCount(value: number): string {
  return value.toLocaleString();
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${formatCount(bytes)} B`;
  if (bytes < 1024 * 1024) {
    return `${Number((bytes / 1024).toFixed(1)).toLocaleString()} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${Number((bytes / (1024 * 1024)).toFixed(1)).toLocaleString()} MB`;
  }
  return `${Number((bytes / (1024 * 1024 * 1024)).toFixed(2)).toLocaleString()} GB`;
}

export function formatSessionStatus(status: string): string {
  const map: Record<string, string> = {
    START: "Started",
    INTERIM: "Interim",
    STOP: "Stopped",
  };
  return map[status] ?? status;
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
