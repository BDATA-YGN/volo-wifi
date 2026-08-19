import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PeriodPreset = "today" | "7d" | "30d" | "90d";

export type PlanOption = {
  id: string;
  code: string;
  name: string;
  quotaType: string;
  isActive: boolean;
};

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

export type ProfileOption = {
  value: string;
  label: string;
};

export type PlanAnalyticsSummary = {
  planCount: number;
  activePlanCount: number;
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

export type PlanDailyPoint = {
  bucket: string;
  label: string;
  itemsCount: number;
  revenue: number;
};

export type PlanTrendSeries = {
  planId: string;
  code: string;
  name: string;
  points: PlanDailyPoint[];
};

export type PlanRow = {
  planId: string;
  code: string;
  name: string;
  quotaType: string;
  isActive: boolean;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  uniqueCredentials: number;
  totalBytes: number;
};

export type PlanQuotaTypeRow = {
  tierId: string | null;
  tierCode: string;
  tierName: string;
  siteCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  sessionsCount: number;
  totalBytes: number;
};

export type PlanAnalyticsData = {
  summary: PlanAnalyticsSummary;
  previousSummary: PlanAnalyticsSummary;
  trendGranularity: "hourly" | "daily";
  trendByPlan: PlanTrendSeries[];
  byPlan: PlanRow[];
  byTier: PlanQuotaTypeRow[];
  dataSource: "aggregated" | "live";
  periodFrom: string;
  periodTo: string;
  preset: PeriodPreset | null;
  scopePlanId: string | null;
  scopeQuotaType: string | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type PlansFormOptions = {
  memberships: OrgMembershipOption[];
  plans: PlanOption[];
  stations: SiteOption[];
  resellers: PartnerOption[];
  profiles?: ProfileOption[];
  currency: string;
  canSwitchOrg?: boolean;
  requiresOrgSelection?: boolean;
};

export type PlanAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
  canSwitchOrg?: boolean;
};

export type PlanAnalyticsParams = {
  orgId?: string;
  stationId?: string;
  resellerId?: string;
  profile?: string;
  planId?: string;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};
