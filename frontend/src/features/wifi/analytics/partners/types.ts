import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";
import type { PartnerStatus } from "@/features/wifi/commerce/partners/types";

export type PeriodPreset = "today" | "7d" | "30d" | "90d";

export type PartnerAnalyticsTab = "stats" | "partners";

export type PartnerOption = {
  id: string;
  code: string;
  name: string;
  status: PartnerStatus;
};

export type PartnerAnalyticsSummary = {
  partnerCount: number;
  activePartnerCount: number;
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

export type PartnerDailyPoint = {
  date: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
  activePartners: number;
};

export type PartnerPlanColumn = {
  planId: string;
  code: string;
  name: string;
};

export type PartnerPlanBreakdown = {
  planId: string;
  code: string;
  name: string;
  tokensCount: number;
  revenue: number;
};

export type PartnerStation = {
  stationId: string;
  name: string;
  stationSizeId?: string | null;
};

export type PartnerSiteOption = {
  id: string;
  code: string;
  name: string;
  stationSizeId: string;
};

export type PartnerTierOption = {
  id: string;
  code: string;
  name: string;
};

export type PartnerRow = {
  resellerId: string;
  code: string;
  name: string;
  status: string;
  stationCount: number;
  stations: PartnerStation[];
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  uniqueCredentials: number;
  totalBytes: number;
  byPlan: PartnerPlanBreakdown[];
};

export type PartnerAnalyticsData = {
  summary: PartnerAnalyticsSummary;
  previousSummary: PartnerAnalyticsSummary;
  dailyTrend: PartnerDailyPoint[];
  byPartner: PartnerRow[];
  plans: PartnerPlanColumn[];
  planTotals: PartnerPlanBreakdown[];
  dataSource: "aggregated" | "live";
  periodFrom: string;
  periodTo: string;
  preset: PeriodPreset | null;
  scopeResellerId: string | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type PartnersFormOptions = {
  memberships: OrgMembershipOption[];
  resellers: PartnerOption[];
  stations: PartnerSiteOption[];
  stationSizes: PartnerTierOption[];
  currency: string;
  canSwitchOrg?: boolean;
  requiresOrgSelection?: boolean;
};

export type PartnerAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
  canSwitchOrg?: boolean;
};

export type PartnerAnalyticsParams = {
  orgId?: string;
  resellerId?: string;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};
