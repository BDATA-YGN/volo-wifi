import type { StationStatus } from "./types";

export function formatStatusLabel(status: StationStatus): string {
  if (status === "ACTIVE") return "Active";
  if (status === "MAINTENANCE") return "Maintenance";
  return "Disabled";
}

export function formatDeviceType(type: string): string {
  if (type === "AP") return "Access point";
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export function readinessColor(score: number): string {
  if (score >= 85) return "#52c41a";
  if (score >= 60) return "#1677ff";
  if (score >= 40) return "#faad14";
  return "#ff4d4f";
}
