import type { MobileCollectionRecord } from "./types";

export {
  collectionResultLabel,
  formatMmk,
  isVisitOverdue,
  methodLabel,
} from "./format-utils";

export function formatScheduleLabel(
  scheduledAt: string | null | undefined,
  result: string,
): string {
  if (!scheduledAt) return result === "PENDING" ? "Unscheduled" : "No schedule";
  const date = new Date(scheduledAt);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function kitLocationLabel(collection: MobileCollectionRecord): string | null {
  const kit = collection.license?.kit;
  if (!kit) return null;
  const parts = [kit.addressLine1, kit.township].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function mapsUrlForCollection(collection: MobileCollectionRecord): string | null {
  const kit = collection.license?.kit;
  if (!kit?.latitude || !kit?.longitude) return null;
  return `https://www.google.com/maps?q=${kit.latitude},${kit.longitude}`;
}

export function canRecordOutcome(collection: MobileCollectionRecord): boolean {
  return collection.result === "PENDING";
}

export function summarizeCollections(collections: MobileCollectionRecord[]) {
  return {
    pending: collections.filter((c) => c.result === "PENDING").length,
    collected: collections.filter((c) => c.result === "COLLECTED").length,
    partial: collections.filter((c) => c.result === "PARTIAL").length,
    failed: collections.filter((c) => c.result === "FAILED").length,
    skipped: collections.filter((c) => c.result === "SKIPPED").length,
  };
}
