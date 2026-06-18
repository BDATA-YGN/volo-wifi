export type {
  ChangelogDetailPayload,
  ChangelogEntry,
  ChangelogListPayload,
  ChangelogMeta,
  ChangelogOrgSummary,
  ChangelogQueryParams,
  LicenseChangeType,
} from "./types";

/** @deprecated Use ChangelogEntry */
export type BillingSubscriptionChangelogRecord = import("./types").ChangelogEntry;
