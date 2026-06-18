export type OrgLicenseStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED";

export type OrgMembershipOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  isPrimary: boolean;
};

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

export type TenantProfile = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
  stationCodePrefix: string;
  planCodePrefix: string;
  resellerCodePrefix: string;
  enableAnnouncement: boolean;
  announcement: string | null;
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

export type TenantProfileMeta = {
  planCount?: number;
  memberships?: OrgMembershipOption[];
  canSwitchOrg?: boolean;
  requiresOrgSelection?: boolean;
};

export type TenantProfileFormValues = {
  name: string;
  description?: string;
  timezone: string;
  currency: string;
  enableAnnouncement: boolean;
  announcement?: string;
  stationCodePrefix?: string;
  planCodePrefix?: string;
  resellerCodePrefix?: string;
};
