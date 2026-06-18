import type { StationStatus } from "./types";
import { STATUS_OPTIONS } from "./constant";

export function formatStatusLabel(status: StationStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}
