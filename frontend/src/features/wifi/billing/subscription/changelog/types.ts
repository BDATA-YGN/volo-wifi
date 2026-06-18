export type ChangelogOrg = {
  id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
};

export type ChangelogLicense = {
  id: string;
  status: string;
  billingCycle: string;
  stationLimit: number;
  effectiveFrom: string;
};

export type ChangelogStationSize = {
  id: string;
  code: string;
  name: string;
  sortOrder?: number;
};

export type ChangelogAdmin = {
  id: string;
  fullName: string;
  username: string;
};

export type LicenseChangeType =
  | "STATION_LIMIT_CHANGE"
  | "STATION_SIZE_PRICE_CHANGE"
  | "PRICE_CHANGE"
  | "STATUS_CHANGE"
  | "OTHER";

export type ChangelogEntry = {
  id: string;
  orgId: string;
  licenseId: string;
  changeType: LicenseChangeType;
  previousStationLimit: number | null;
  newStationLimit: number | null;
  stationSizeId: string | null;
  previousUnitPrice: string | null;
  newUnitPrice: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  effectiveFrom: string;
  reason: string | null;
  createdAt: string;
  stationSize: ChangelogStationSize | null;
  changedByAdmin: ChangelogAdmin;
};

export type ChangelogOrgSummary = {
  org: ChangelogOrg;
  license: ChangelogLicense;
  historyCount: number;
  lastChangeAt: string | null;
  lastChangeType: LicenseChangeType | null;
};

export type ChangelogListPayload = {
  orgs: ChangelogOrgSummary[];
};

export type ChangelogDetailPayload = {
  org: ChangelogOrg;
  license: ChangelogLicense;
  entries: ChangelogEntry[];
  availableTiers: ChangelogStationSize[];
};

export type ChangelogMeta = {
  orgCount?: number;
  totalEntries?: number;
  orgsWithHistory?: number;
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
  countsByChangeType?: Partial<Record<LicenseChangeType, number>>;
};

export type ChangelogQueryParams = {
  orgId?: string;
  search?: string;
  changeType?: LicenseChangeType;
  tierCode?: string;
  page?: number;
  limit?: number;
};
