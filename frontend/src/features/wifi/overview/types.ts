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

export type OverviewSessionHealth = {
  stationId: string;
  code: string;
  name: string;
  liveSessions: number;
  stalledSessions: number;
  todaySessions: number;
};

export type OverviewPartnerSales = {
  resellerId: string;
  code: string;
  name: string;
  orders: number;
  revenue: number;
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
  sessionHealth: OverviewSessionHealth[];
  partnerSales: OverviewPartnerSales[];
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
