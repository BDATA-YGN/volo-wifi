import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type TrendGranularity = "daily";

export type RevenueAnalyticsSummary = {
  revenue: number;
  netRevenue: number;
  commission: number;
  ordersCount: number;
  itemsCount: number;
  avgOrderValue: number;
  siteCount: number;
  tierCount: number;
};

export type RevenueTrendPoint = {
  periodKey: string;
  label: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
};

export type RevenueSiteRow = {
  stationId: string;
  code: string;
  name: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
};

export type RevenueTierRow = {
  stationSizeId: string;
  code: string;
  name: string;
  sortOrder: number;
  siteCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sites: RevenueSiteRow[];
};

export type RevenueAnalyticsData = {
  summary: RevenueAnalyticsSummary;
  previousSummary: RevenueAnalyticsSummary;
  trend: RevenueTrendPoint[];
  trendGranularity: TrendGranularity;
  byTier: RevenueTierRow[];
  dataSource: "aggregated" | "live";
  month: string;
  periodFrom: string;
  periodTo: string;
  org: { id: string; name: string; code: string; currency: string };
};

export type RevenueFormOptions = {
  memberships: OrgMembershipOption[];
  currency: string;
  canSwitchOrg?: boolean;
  requiresOrgSelection?: boolean;
};

export type RevenueAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
  canSwitchOrg?: boolean;
};

export type RevenueAnalyticsParams = {
  orgId?: string;
  month?: string;
};
