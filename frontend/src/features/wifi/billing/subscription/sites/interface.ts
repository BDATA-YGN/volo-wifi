export type {
  LicensedSiteRow,
  LicensedSitesDetailPayload,
  LicensedSitesLicense,
  LicensedSitesListPayload,
  LicensedSitesMeta,
  LicensedSitesOrg,
  LicensedSitesOrgSummary,
  LicensedSitesQueryParams,
  LicensedSitesTierGroup,
} from "./types";

/** @deprecated Use LicensedSiteRow */
export type BillingSubscriptionSitesRecord = import("./types").LicensedSiteRow;
