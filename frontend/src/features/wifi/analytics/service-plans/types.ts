import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";
import type { PlanQuotaType } from "@/features/wifi/catalog/service-plans/types";

export type PeriodPreset = "7d" | "30d" | "90d";

export type PlanOption = {
  id: string;
  code: string;
  name: string;
  quotaType: PlanQuotaType;
  isActive: boolean;
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
  date: string;
  ordersCount: number;
  revenue: number;
  commission: number;
  itemsCount: number;
  sessionsCount: number;
  totalBytes: number;
  activePlans: number;
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
  quotaType: string;
  planCount: number;
  activePlanCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
};

export type PlanAnalyticsData = {
  summary: PlanAnalyticsSummary;
  previousSummary: PlanAnalyticsSummary;
  dailyTrend: PlanDailyPoint[];
  byPlan: PlanRow[];
  byQuotaType: PlanQuotaTypeRow[];
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
  currency: string;
};

export type PlanAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
};

export type PlanAnalyticsParams = {
  orgId?: string;
  planId?: string;
  quotaType?: PlanQuotaType;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};
