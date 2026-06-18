import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";
import type { PartnerStatus } from "@/features/wifi/commerce/partners/types";

export type PeriodPreset = "7d" | "30d" | "90d";

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
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
  activePartners: number;
};

export type PartnerRow = {
  resellerId: string;
  code: string;
  name: string;
  status: string;
  stationCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  uniqueCredentials: number;
  totalBytes: number;
};

export type PartnerAnalyticsData = {
  summary: PartnerAnalyticsSummary;
  previousSummary: PartnerAnalyticsSummary;
  dailyTrend: PartnerDailyPoint[];
  byPartner: PartnerRow[];
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
  currency: string;
};

export type PartnerAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
};

export type PartnerAnalyticsParams = {
  orgId?: string;
  resellerId?: string;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};
