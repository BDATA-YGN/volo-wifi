import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PeriodPreset = "today" | "7d" | "30d" | "90d";

export type SiteAnalyticsTab = "stats" | "sites" | "tiers";

export type SiteOption = {
  id: string;
  code: string;
  name: string;
  status: string;
  stationSizeId: string;
  stationSizeCode: string;
  stationSizeName: string;
};

export type StationSizeOption = {
  id: string;
  code: string;
  name: string;
  sortOrder?: number;
};

export type SiteAnalyticsSummary = {
  siteCount: number;
  activeSiteCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  uniqueCredentials: number;
  totalBytes: number;
  totalSessionTimeSec: number;
};

export type SiteDailyPoint = {
  date: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
  activeSites: number;
};

export type SitePlanColumn = {
  planId: string;
  code: string;
  name: string;
};

export type SitePlanBreakdown = {
  planId: string;
  code: string;
  name: string;
  tokensCount: number;
  revenue: number;
};

export type SiteRow = {
  stationId: string;
  code: string;
  name: string;
  status: string;
  location: string | null;
  stationSizeId: string;
  stationSizeCode: string;
  stationSizeName: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  uniqueCredentials: number;
  totalBytes: number;
  byPlan: SitePlanBreakdown[];
};

export type SiteTierRow = {
  stationSizeId: string;
  code: string;
  name: string;
  siteCount: number;
  activeSiteCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
  byPlan: SitePlanBreakdown[];
};

export type SiteAnalyticsData = {
  summary: SiteAnalyticsSummary;
  previousSummary: SiteAnalyticsSummary;
  dailyTrend: SiteDailyPoint[];
  bySite: SiteRow[];
  byTier: SiteTierRow[];
  plans: SitePlanColumn[];
  planTotals: SitePlanBreakdown[];
  pagination: { page: number; limit: number; total: number } | null;
  dataSource: "aggregated" | "live";
  statsCoverage: {
    daysInPeriod: number;
    daysWithSalesStats: number;
    daysWithUsageStats: number;
    lastAggregatedAt: string | null;
  } | null;
  periodFrom: string;
  periodTo: string;
  preset: PeriodPreset | null;
  view?: SiteAnalyticsTab;
  scopeStationId: string | null;
  scopeStationSizeId: string | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type SitesFormOptions = {
  memberships: OrgMembershipOption[];
  stations: SiteOption[];
  stationSizes: StationSizeOption[];
  currency: string;
  canSwitchOrg?: boolean;
  requiresOrgSelection?: boolean;
};

export type SiteAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
  canSwitchOrg?: boolean;
  view?: SiteAnalyticsTab;
  pagination?: { page: number; limit: number; total: number } | null;
};

export type SiteAnalyticsParams = {
  orgId?: string;
  stationId?: string;
  stationSizeId?: string;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
  view?: SiteAnalyticsTab;
  page?: number;
  limit?: number;
};
