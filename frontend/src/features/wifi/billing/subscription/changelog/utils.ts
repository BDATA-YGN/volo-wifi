import type { ChangelogEntry } from "./types";
import { formatMoney } from "../../tier-rates/platform/utils";

export function formatChangeType(changeType: string): string {
  return changeType.replace(/_/g, " ");
}

export function describeChangelogEntry(entry: ChangelogEntry, currency = "MMK"): string {
  switch (entry.changeType) {
    case "STATION_LIMIT_CHANGE":
      return `Site limit ${entry.previousStationLimit ?? "—"} → ${entry.newStationLimit ?? "—"}`;
    case "STATUS_CHANGE":
      return `Status ${entry.previousStatus ?? "—"} → ${entry.newStatus ?? "—"}`;
    case "STATION_SIZE_PRICE_CHANGE":
    case "PRICE_CHANGE": {
      const tier = entry.stationSize?.code ? ` (${entry.stationSize.code})` : "";
      const prev = entry.previousUnitPrice
        ? formatMoney(entry.previousUnitPrice, currency)
        : "—";
      const next = entry.newUnitPrice ? formatMoney(entry.newUnitPrice, currency) : "—";
      return `Unit price${tier}: ${prev} → ${next}`;
    }
    default:
      if (entry.newStationLimit != null && entry.previousStationLimit == null) {
        return `Initial site limit: ${entry.newStationLimit}`;
      }
      if (entry.newStatus && !entry.previousStatus) {
        return `Initial status: ${entry.newStatus}`;
      }
      return formatChangeType(entry.changeType);
  }
}
