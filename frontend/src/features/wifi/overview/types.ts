import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type OverviewSummary = {
  activeSessions: number;
  activeBytes: number;
  stalledSessions: number;
  todaySessions: number;
  todayBytes: number;
  todayOrders: number;
  todayRevenue: number;
  todayPayments: number;
  weekRevenue: number;
  weekOrders: number;
  weekSessions: number;
  pendingApprovals: number;
  siteCount: number;
  partnerCount: number;
  licensedSites: number;
  siteLimit: number | null;
  licenseStatus: string | null;
};

export type OverviewTrendPoint = {
  date: string;
  revenue: number;
  orders: number;
  sessions: number;
  totalBytes: number;
};

export type OverviewSitePulse = {
  stationId: string;
  code: string;
  name: string;
  activeSessions: number;
  todaySessions: number;
  todayRevenue: number;
  todayBytes: number;
};

export type OverviewRecentOrder = {
  orderId: string;
  orderNo: string;
  stationCode: string | null;
  resellerCode: string | null;
  total: number;
  currency: string;
  soldAt: string | null;
};

export type OverviewRecentSession = {
  sessionId: string;
  userName: string | null;
  stationCode: string | null;
  status: string;
  startedAt: string;
  totalBytes: number;
  isStalled: boolean;
};

export type OverviewContext = {
  consoleRole: string;
  orgRoleCodes: string[];
  persona: string;
};

export type OverviewDashboardData = {
  summary: OverviewSummary;
  trend7d: OverviewTrendPoint[];
  topSites: OverviewSitePulse[];
  recentOrders: OverviewRecentOrder[];
  recentSessions: OverviewRecentSession[];
  context: OverviewContext;
  generatedAt: string;
  org: { id: string; name: string; code: string; currency: string };
};

export type OverviewFormOptions = {
  memberships: OrgMembershipOption[];
};

export type OverviewMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
  canSwitchOrg?: boolean;
};

export type OverviewParams = {
  orgId?: string;
};

export type DashboardWidgetId =
  | "operations"
  | "commerce"
  | "finance"
  | "network"
  | "billing"
  | "analytics";

export type DashboardWidgetDefinition = {
  id: DashboardWidgetId;
  title: string;
  description: string;
  href: string;
  routes: string[];
  personas: string[];
};
