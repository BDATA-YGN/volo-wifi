import type { MobileStatusMeta } from "@/features/mobile/shared/mobileStatusTones";

export const ASSIGNMENT_STATUS_META: Record<string, MobileStatusMeta> = {
  ASSIGNED: { tone: "info", label: "Assigned" },
  ACCEPTED: { tone: "success", label: "Accepted" },
  COMPLETED: { tone: "neutral", label: "Completed" },
  CANCELLED: { tone: "danger", label: "Cancelled" },
};

export const ASSIGNMENT_FILTERS = [
  { value: "open" as const, label: "Open" },
  { value: "all" as const, label: "All" },
];
