import type { DeviceType } from "./types";

export function formatDeviceType(type: DeviceType | string): string {
  if (type === "AP") return "Access point";
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export function deviceLabel(vendor: string | null, model: string | null, type: string): string {
  const parts = [vendor, model].filter(Boolean);
  return parts.length ? parts.join(" ") : formatDeviceType(type);
}

export function readinessColor(score: number): string {
  if (score >= 85) return "#52c41a";
  if (score >= 60) return "#1677ff";
  if (score >= 40) return "#faad14";
  return "#ff4d4f";
}
