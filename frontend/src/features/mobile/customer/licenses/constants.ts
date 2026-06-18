import type { LicenseStatusFilter } from "./types";

export const LICENSE_STATUS_FILTERS: { value: LicenseStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "TERMINATED", label: "Terminated" },
];

export const LICENSE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
};

export const LICENSE_CLASS_LABEL: Record<string, string> = {
  A: "Class A",
  B: "Class B",
  C: "Class C",
  PAC: "Class PAC",
  UNKNOWN: "Unknown",
};

export const KIT_STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  INSTALLED: "Installed",
  DAMAGED: "Damaged",
  IN_REPAIR: "In repair",
  RETIRED: "Retired",
};
