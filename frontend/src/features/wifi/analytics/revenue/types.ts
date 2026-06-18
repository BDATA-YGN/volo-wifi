import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PeriodPreset = "7d" | "30d" | "90d" | "12m";
export type TrendGranularity = "daily" | "monthly" | "yearly";

export type RevenueAnalyticsSummary = {
  revenue: number;
  netRevenue: number;
  commission: number;
  ordersCount: number;
  itemsCount: number;
  paymentsCollected: number;
  paymentCount: number;
  avgOrderValue: number;
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

export type PaymentMethodRow = {
  method: string;
  paymentsCount: number;
  amount: number;
};

export type OrderStatusRow = {
  status: string;
  ordersCount: number;
  revenue: number;
};

export type RevenueAnalyticsData = {
  summary: RevenueAnalyticsSummary;
  previousSummary: RevenueAnalyticsSummary;
  trend: RevenueTrendPoint[];
  trendGranularity: TrendGranularity;
  byPaymentMethod: PaymentMethodRow[];
  byOrderStatus: OrderStatusRow[];
  dataSource: "aggregated" | "live";
  periodFrom: string;
  periodTo: string;
  preset: PeriodPreset | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type RevenueFormOptions = {
  memberships: OrgMembershipOption[];
  currency: string;
};

export type RevenueAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
};

export type RevenueAnalyticsParams = {
  orgId?: string;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};
