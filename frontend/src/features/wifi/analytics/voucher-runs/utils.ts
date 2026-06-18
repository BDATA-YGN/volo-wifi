export function formatDelta(delta: number | null): string {
  if (delta === null) return "new";
  if (delta === 0) return "0%";
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function utilizationPercent(issued: number, remaining: number): number {
  if (issued <= 0) return 0;
  const redeemed = Math.max(0, issued - remaining);
  return Math.round((redeemed / issued) * 1000) / 10;
}

export function utilizationColor(percent: number): string {
  if (percent >= 80) return "#52c41a";
  if (percent >= 50) return "#1677ff";
  if (percent >= 25) return "#faad14";
  return "#ff4d4f";
}
