export type OrgLicenseStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED";

export type SubscriptionOrg = {
  id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
  timezone?: string;
};

export type SubscriptionRecord = {
  id: string;
  orgId: string;
  status: OrgLicenseStatus;
  billingCycle: string;
  stationLimit: number;
  currentActiveStationCount: number;
  currency: string;
  effectiveFrom: string;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  org: SubscriptionOrg;
  activeStationCount: number;
  usagePercent: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
  remainingSlots: number;
};

export type StationUsageByTier = {
  stationSize: { id: string; code: string; name: string; sortOrder: number };
  count: number;
};

export type SubscriptionHistoryEntry = {
  id: string;
  changeType: string;
  previousStationLimit: number | null;
  newStationLimit: number | null;
  previousStatus: OrgLicenseStatus | null;
  newStatus: OrgLicenseStatus | null;
  effectiveFrom: string;
  reason: string | null;
  createdAt: string;
  changedByAdmin: { id: string; fullName: string; username: string };
};

export type SubscriptionDetailPayload = {
  license: SubscriptionRecord;
  usageByTier: StationUsageByTier[];
  recentHistory: SubscriptionHistoryEntry[];
  overrideCount: number;
  invoiceSummary: { status: string; count: number }[];
};

export type SubscriptionListPayload = {
  subscriptions: SubscriptionRecord[];
};

export type SubscriptionMeta = {
  total?: number;
  activeCount?: number;
  suspendedCount?: number;
  nearLimitCount?: number;
};

export type SubscriptionUpdateFormValues = {
  stationLimit: number;
  status: OrgLicenseStatus;
  expiresAt?: string | null;
  notes?: string;
  reason?: string;
};
