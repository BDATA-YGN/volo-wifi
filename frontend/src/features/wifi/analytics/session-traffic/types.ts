import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PeriodPreset = "7d" | "30d" | "90d";

export type SiteOption = {
  id: string;
  code: string;
  name: string;
  status: string;
  stationSizeId: string;
  stationSizeCode: string;
  stationSizeName: string;
};

export type PlanOption = {
  id: string;
  code: string;
  name: string;
};

export type SessionTrafficSummary = {
  sessionsCount: number;
  uniqueCredentials: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  totalBytes: number;
  totalSessionTimeSec: number;
  avgSessionTimeSec: number;
  avgBytesPerSession: number;
  activeSessionsNow: number;
  activeBytesNow: number;
};

export type SessionTrafficDailyPoint = {
  date: string;
  sessionsCount: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  totalBytes: number;
  uniqueCredentials: number;
};

export type SessionTrafficSiteRow = {
  stationId: string;
  code: string;
  name: string;
  status: string;
  location: string | null;
  sessionsCount: number;
  uniqueCredentials: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  totalBytes: number;
  totalSessionTimeSec: number;
};

export type SessionTrafficPlanRow = {
  planId: string;
  code: string;
  name: string;
  sessionsCount: number;
  uniqueCredentials: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  totalBytes: number;
  totalSessionTimeSec: number;
};

export type SessionTrafficTerminateRow = {
  cause: string;
  count: number;
};

export type SessionTrafficData = {
  summary: SessionTrafficSummary;
  previousSummary: SessionTrafficSummary;
  dailyTrend: SessionTrafficDailyPoint[];
  bySite: SessionTrafficSiteRow[];
  byPlan: SessionTrafficPlanRow[];
  byTerminateCause: SessionTrafficTerminateRow[];
  dataSource: "aggregated" | "live";
  periodFrom: string;
  periodTo: string;
  preset: PeriodPreset | null;
  scopeStationId: string | null;
  scopePlanId: string | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type SessionTrafficFormOptions = {
  memberships: OrgMembershipOption[];
  stations: SiteOption[];
  plans: PlanOption[];
};

export type SessionTrafficMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
};

export type SessionTrafficParams = {
  orgId?: string;
  stationId?: string;
  planId?: string;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};
