import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PeriodPreset = "7d" | "30d" | "90d";

export type SettlementStatus =
  | "DRAFT"
  | "DECLARED"
  | "STATION_ATTESTED"
  | "ORG_APPROVED"
  | "REJECTED"
  | "POSTED";

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

export type SettlementSummary = {
  settlementCount: number;
  openCount: number;
  postedCount: number;
  rejectedCount: number;
  withVarianceCount: number;
  systemTotal: number;
  declaredTotal: number;
  varianceTotal: number;
  systemPaymentsCount: number;
  systemOrdersCount: number;
};

export type SettlementStatusRow = {
  status: string;
  count: number;
  systemTotal: number;
  declaredTotal: number;
};

export type SettlementPartnerRow = {
  resellerId: string;
  code: string;
  name: string;
  settlementCount: number;
  systemTotal: number;
  varianceTotal: number;
  openCount: number;
};

export type SettlementSiteRow = {
  stationId: string;
  code: string;
  name: string;
  settlementCount: number;
  systemTotal: number;
  varianceTotal: number;
  openCount: number;
};

export type SettlementDailyPoint = {
  date: string;
  settlementCount: number;
  systemTotal: number;
  varianceTotal: number;
};

export type SettlementRow = {
  settlementId: string;
  status: SettlementStatus;
  periodStart: string;
  periodEnd: string;
  resellerId: string;
  resellerCode: string;
  resellerName: string;
  stationId: string;
  stationCode: string;
  stationName: string;
  systemCurrency: string;
  systemTotal: number;
  declaredTotal: number | null;
  declaredCurrency: string;
  variance: number | null;
  systemPaymentsCount: number;
  systemOrdersCount: number;
  hasPosting: boolean;
  declaredNote: string | null;
  updatedAt: string;
};

export type SettlementLineRow = {
  paymentMethod: string;
  systemAmount: number;
  systemPaymentsCount: number;
  systemOrdersCount: number;
  declaredAmount: number | null;
  varianceAmount: number | null;
};

export type SettlementDetail = SettlementRow & {
  lines: SettlementLineRow[];
  attestationCount: number;
};

export type SettlementAnalyticsData = {
  summary: SettlementSummary;
  previousSummary: SettlementSummary;
  byStatus: SettlementStatusRow[];
  byPartner: SettlementPartnerRow[];
  bySite: SettlementSiteRow[];
  dailyTrend: SettlementDailyPoint[];
  settlements: SettlementRow[];
  periodFrom: string;
  periodTo: string;
  preset: PeriodPreset | null;
  scopeStationId: string | null;
  scopeResellerId: string | null;
  scopeStatus: string | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type SettlementsFormOptions = {
  memberships: OrgMembershipOption[];
  stations: SiteOption[];
  resellers: PartnerOption[];
};

export type SettlementAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
};

export type SettlementAnalyticsParams = {
  orgId?: string;
  stationId?: string;
  resellerId?: string;
  status?: SettlementStatus;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};

export type SettlementDetailParams = {
  orgId?: string;
  settlementId: string;
};
