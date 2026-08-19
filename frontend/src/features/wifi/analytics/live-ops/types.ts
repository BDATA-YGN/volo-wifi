import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type LiveOpsTab = "stats" | "sites";

export type SiteOption = {
  id: string;
  code: string;
  name: string;
  status: string;
  stationSizeId?: string;
};

export type StationSizeOption = {
  id: string;
  code: string;
  name: string;
  sortOrder?: number;
};

export type PlanOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type ProfileOption = {
  value: string;
  label: string;
};

export type LiveOpsSummary = {
  activeSessions: number;
  activeBytes: number;
  stalledSessions: number;
  sessionsStarted: number;
  sessionsStopped: number;
  ordersCount: number;
  revenue: number;
  paymentsCount: number;
  uniqueCredentials: number;
  todayOrders: number;
  todayRevenue: number;
  todaySessions: number;
  todayBytes: number;
};

export type LiveOpsHourlyPoint = {
  hour: string;
  sessionsStarted: number;
  ordersCount: number;
  revenue: number;
  totalBytes: number;
};

export type LiveOpsSiteRow = {
  stationId: string;
  code: string;
  name: string;
  status: string;
  radiusStart: number;
  radiusInterim: number;
  radiusStop: number;
  totalBytes: number;
  tokenStatus: Array<{ status: string; count: number }>;
};

export type LiveOpsAnalyticsData = {
  summary: LiveOpsSummary;
  hourlyTrend: LiveOpsHourlyPoint[];
  bySite: LiveOpsSiteRow[];
  generatedAt: string;
  windowFrom: string;
  windowTo: string;
  date: string;
  scopeStationId: string | null;
  scopeStationSizeId: string | null;
  scopePlanId: string | null;
  scopeProfile: string | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type LiveOpsFormOptions = {
  memberships: OrgMembershipOption[];
  stations: SiteOption[];
  stationSizes: StationSizeOption[];
  plans: PlanOption[];
  profiles: ProfileOption[];
  canSwitchOrg?: boolean;
  requiresOrgSelection?: boolean;
};

export type LiveOpsAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
  canSwitchOrg?: boolean;
};

export type LiveOpsAnalyticsParams = {
  orgId?: string;
  stationId?: string;
  stationSizeId?: string;
  planId?: string;
  profile?: string;
  date?: string;
};
