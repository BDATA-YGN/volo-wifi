import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PeriodPreset = "today" | "7d" | "30d" | "90d";

export type TrendGranularity = "daily" | "hourly";

export type SiteOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type PlanOption = {
  id: string;
  code: string;
  name: string;
};

export type VoucherRunSummary = {
  batchCount: number;
  totalIssued: number;
  totalRemaining: number;
  totalRedeemed: number;
  utilizationPercent: number;
  activatedInPeriod: number;
  expiredInPeriod: number;
  revokedInPeriod: number;
};

export type VoucherRunDailyPoint = {
  date: string;
  batchesCreated: number;
  vouchersIssued: number;
  vouchersActivated: number;
};

export type VoucherRunBatchRow = {
  batchId: string;
  batchNo: string;
  prefix: string | null;
  planId: string;
  planCode: string;
  planName: string;
  stationId: string | null;
  stationCode: string | null;
  stationName: string | null;
  quantity: number;
  remaining: number;
  redeemed: number;
  utilizationPercent: number;
  activatedCount: number;
  createdAt: string;
  statusBreakdown: Record<string, number>;
};

export type VoucherRunPlanRow = {
  planId: string;
  code: string;
  name: string;
  batchCount: number;
  totalIssued: number;
  totalRemaining: number;
  totalRedeemed: number;
  activatedCount: number;
  utilizationPercent: number;
};

export type VoucherRunStatusRow = {
  status: string;
  count: number;
};

export type VoucherRunAnalyticsData = {
  summary: VoucherRunSummary;
  previousSummary: VoucherRunSummary;
  dailyTrend: VoucherRunDailyPoint[];
  trendGranularity?: TrendGranularity;
  byBatch: VoucherRunBatchRow[];
  byPlan: VoucherRunPlanRow[];
  byStatus: VoucherRunStatusRow[];
  periodFrom: string;
  periodTo: string;
  preset: PeriodPreset | null;
  scopePlanId: string | null;
  scopeStationId: string | null;
  scopeBatchId: string | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type VoucherRunsFormOptions = {
  memberships: OrgMembershipOption[];
  plans: PlanOption[];
  stations: SiteOption[];
};

export type VoucherRunAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
};

export type VoucherRunAnalyticsParams = {
  orgId?: string;
  planId?: string;
  stationId?: string;
  batchId?: string;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};
