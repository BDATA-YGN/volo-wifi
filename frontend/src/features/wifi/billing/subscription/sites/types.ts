export type LicensedSitesOrg = {
  id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
};

export type LicensedSitesLicense = {
  id: string;
  orgId: string;
  status: string;
  billingCycle: string;
  stationLimit: number;
  currentActiveStationCount: number;
  currency: string;
  effectiveFrom: string;
  expiresAt: string | null;
  billableCount: number;
  usagePercent: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
  remainingSlots: number;
};

export type LicensedSiteRow = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  address: string | null;
  status: string;
  isBillable: boolean;
  createdAt: string;
  stationSize: { id: string; code: string; name: string; sortOrder?: number };
};

export type LicensedSitesTierGroup = {
  stationSize: { id: string; code: string; name: string; sortOrder: number };
  sites: LicensedSiteRow[];
  billableCount: number;
  displayedCount: number;
  effectiveUnitPrice: string | null;
  platformUnitPrice: string | null;
  currency: string;
  hasOverride: boolean;
  monthlySubtotal: string | null;
};

export type LicensedSitesOrgSummary = {
  org: LicensedSitesOrg;
  license: LicensedSitesLicense;
};

export type LicensedSitesListPayload = {
  orgs: LicensedSitesOrgSummary[];
};

export type LicensedSitesDetailPayload = {
  org: LicensedSitesOrg;
  license: LicensedSitesLicense;
  groups: LicensedSitesTierGroup[];
  allTiers: { id: string; code: string; name: string; sortOrder: number }[];
};

export type LicensedSitesMeta = {
  orgCount?: number;
  totalBillable?: number;
  totalInactive?: number;
  stationLimit?: number;
  remainingSlots?: number;
  estimatedMonthlyTotal?: string | null;
  currency?: string;
  filteredCount?: number;
};

export type LicensedSitesQueryParams = {
  orgId?: string;
  search?: string;
  tierCode?: string;
  billableOnly?: boolean;
};
