export function formatCount(value: number): string {
  return value.toLocaleString();
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatDelta(delta: number | null): string {
  if (delta === null) return "new";
  if (delta === 0) return "0%";
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

export function formatCredentialType(type: string): string {
  if (type === "VOUCHER_TOKEN") return "Voucher token";
  if (type === "USER_PASSWORD") return "Username & password";
  return type;
}
