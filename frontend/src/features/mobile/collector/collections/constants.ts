import type { MobileStatusMeta } from "@/features/mobile/shared/mobileStatusTones";
import type { CollectionScopeFilter } from "./types";

export const COLLECTION_SCOPE_FILTERS: { value: CollectionScopeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Done" },
];

export const OUTCOME_OPTIONS: {
  value: Exclude<import("./types").SmsCollectionResult, "PENDING">;
  label: string;
  description: string;
}[] = [
  { value: "COLLECTED", label: "Collected", description: "Full amount received" },
  { value: "PARTIAL", label: "Partial", description: "Some amount received" },
  { value: "FAILED", label: "Failed", description: "Could not collect" },
  { value: "SKIPPED", label: "Skipped", description: "Visit not attempted" },
];

export const COLLECTION_STATUS_META: Record<string, MobileStatusMeta> = {
  PENDING: { tone: "info", label: "Scheduled" },
  COLLECTED: { tone: "success", label: "Collected" },
  PARTIAL: { tone: "caution", label: "Partial" },
  FAILED: { tone: "danger", label: "Failed" },
  SKIPPED: { tone: "neutral", label: "Skipped" },
};
