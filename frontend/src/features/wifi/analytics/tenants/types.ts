import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PeriodPreset = "7d" | "30d" | "90d";

export type TenantAnalyticsSummary = {
  tenantCount: number;
  activeTenantCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  totalBytes: number;
};

export type TenantDailyPoint = {
  date: string;
  ordersCount: number;
  revenue: number;
  commission: number;
  activeTenants: number;
  sessionsCount: number;
};

export type TenantRow = {
  orgId: string;
  code: string;
  name: string;
  isActive: boolean;
  currency: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  partnerCount: number;
  stationCount: number;
};

export type TenantAnalyticsData = {
  summary: TenantAnalyticsSummary;
  previousSummary: TenantAnalyticsSummary;
  dailyTrend: TenantDailyPoint[];
  byTenant: TenantRow[];
  dataSource: "aggregated" | "live";
  periodFrom: string;
  periodTo: string;
  preset: PeriodPreset | null;
  scopeOrgId: string | null;
};

export type TenantAnalyticsMeta = {
  isPlatformView?: boolean;
  tenantCount?: number;
  memberships?: OrgMembershipOption[];
};

export type TenantAnalyticsParams = {
  orgId?: string;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};
