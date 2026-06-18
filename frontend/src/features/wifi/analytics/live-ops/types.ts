import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type WindowHours = 1 | 6 | 24;

export type SiteOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type PartnerOption = {
  id: string;
  code: string;
  name: string;
  status: string;
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

export type LiveOpsStatusRow = {
  status: string;
  count: number;
};

export type LiveOpsSiteRow = {
  stationId: string;
  code: string;
  name: string;
  status: string;
  activeSessions: number;
  sessionsStarted: number;
  ordersCount: number;
  revenue: number;
  totalBytes: number;
};

export type LiveOpsPartnerRow = {
  resellerId: string;
  code: string;
  name: string;
  activeSessions: number;
  sessionsStarted: number;
  ordersCount: number;
  revenue: number;
  totalBytes: number;
};

export type LiveOpsRecentSessionRow = {
  sessionId: string;
  status: string;
  userName: string | null;
  stationCode: string | null;
  stationName: string | null;
  startedAt: string;
  lastInterimAt: string | null;
  totalBytes: number;
  sessionTimeSec: number | null;
  isStalled: boolean;
};

export type LiveOpsRecentOrderRow = {
  orderId: string;
  orderNo: string;
  status: string;
  resellerCode: string | null;
  stationCode: string | null;
  total: number;
  currency: string;
  soldAt: string | null;
  createdAt: string;
};

export type LiveOpsAnalyticsData = {
  summary: LiveOpsSummary;
  byStatus: LiveOpsStatusRow[];
  hourlyTrend: LiveOpsHourlyPoint[];
  bySite: LiveOpsSiteRow[];
  byPartner: LiveOpsPartnerRow[];
  recentSessions: LiveOpsRecentSessionRow[];
  recentOrders: LiveOpsRecentOrderRow[];
  generatedAt: string;
  windowFrom: string;
  windowTo: string;
  windowHours: WindowHours;
  scopeStationId: string | null;
  scopeResellerId: string | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type LiveOpsFormOptions = {
  memberships: OrgMembershipOption[];
  stations: SiteOption[];
  resellers: PartnerOption[];
};

export type LiveOpsAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
};

export type LiveOpsAnalyticsParams = {
  orgId?: string;
  stationId?: string;
  resellerId?: string;
  windowHours?: WindowHours;
};
