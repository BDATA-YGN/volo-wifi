export type OrgLicenseStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED";

export type TenantLicenseBrief = {
  id: string;
  status: OrgLicenseStatus;
  billingCycle: string;
  stationLimit: number;
  currentActiveStationCount: number;
  currency: string;
  effectiveFrom: string;
  expiresAt: string | null;
};

export type TenantRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  orgLicense: TenantLicenseBrief | null;
  activeStationCount: number;
  totalStationCount: number;
  memberCount: number;
  usagePercent: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
  remainingSlots: number | null;
  hasLicense: boolean;
};

export type TenantDetailRecord = TenantRecord & {
  stationCodePrefix?: string;
  planCodePrefix?: string;
  resellerCodePrefix?: string;
  enableAnnouncement?: boolean;
  announcement?: string | null;
  adminId?: string | null;
};

export type TenantsMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  activeOrgCount?: number;
  withLicenseCount?: number;
  nearLimitCount?: number;
  licenseStatusCounts?: Partial<Record<OrgLicenseStatus, number>>;
  planCount?: number;
  resellerCount?: number;
};

export type TenantsListParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: "true" | "false";
  licenseStatus?: OrgLicenseStatus;
  hasLicense?: "true" | "false";
};

export type TenantEditFormValues = {
  name: string;
  description?: string;
  isActive: boolean;
  timezone: string;
  currency: string;
  enableAnnouncement: boolean;
  announcement?: string;
};
