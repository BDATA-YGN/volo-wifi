import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";
import type { PartnerStatus } from "@/features/wifi/commerce/partners/types";

export type PeriodPreset = "7d" | "30d" | "90d";

export type ResellerOption = {
  id: string;
  code: string;
  name: string;
  status: PartnerStatus;
};

export type InsightsSummary = {
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

export type InsightsDailyPoint = {
  date: string;
  ordersCount: number;
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
};

export type InsightsPlanRow = {
  planId: string | null;
  planCode: string;
  planName: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
};

export type InsightsStationRow = {
  stationId: string | null;
  stationCode: string;
  stationName: string;
  ordersCount: number;
  revenue: number;
  sessionsCount: number;
  totalBytes: number;
};

export type PartnerInsightsData = {
  summary: InsightsSummary;
  previousSummary: InsightsSummary;
  dailyTrend: InsightsDailyPoint[];
  byPlan: InsightsPlanRow[];
  byStation: InsightsStationRow[];
  dataSource: "aggregated" | "live";
  reseller: ResellerOption;
  org: { id: string; name: string; currency: string };
  periodFrom: string;
  periodTo: string;
  preset: PeriodPreset | null;
};

export type InsightsFormOptions = {
  memberships: OrgMembershipOption[];
  resellers: ResellerOption[];
  currency: string;
};

export type InsightsMeta = {
  mode?: "partner" | "org";
  orgId?: string;
  resellerId?: string;
  preset?: PeriodPreset | null;
  periodFrom?: string;
  periodTo?: string;
  requiresOrgSelection?: boolean;
  requiresResellerSelection?: boolean;
  memberships?: OrgMembershipOption[];
  resellers?: ResellerOption[];
};

export type InsightsParams = {
  orgId?: string;
  resellerId?: string;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};
