import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";
import type { CredentialStatus } from "@/features/wifi/commerce/access-tokens/types";

export type PeriodPreset = "today" | "7d" | "30d" | "90d";

export type TrendGranularity = "daily" | "hourly";

export type CredentialType = "VOUCHER_TOKEN" | "USER_PASSWORD";

export type PlanOption = {
  id: string;
  code: string;
  name: string;
};

export type CredentialAnalyticsSummary = {
  inventoryCount: number;
  activeCount: number;
  terminalCount: number;
  soldInPeriod: number;
  activatedInPeriod: number;
  expiredInPeriod: number;
  revokedInPeriod: number;
  consumedInPeriod: number;
  archivedInPeriod: number;
};

export type CredentialDailyPoint = {
  date: string;
  sold: number;
  activated: number;
  expired: number;
  revoked: number;
  archived: number;
};

export type CredentialPeriodCounts = {
  sold: number;
  activated: number;
  expired: number;
  revoked: number;
  consumed: number;
  archived: number;
};

export type CredentialSitePlanRow = CredentialPeriodCounts & {
  planId: string;
  code: string;
  name: string;
};

export type CredentialSiteRow = CredentialPeriodCounts & {
  stationId: string | null;
  code: string;
  name: string;
  byPlan: CredentialSitePlanRow[];
};

export type CredentialAnalyticsData = {
  summary: CredentialAnalyticsSummary;
  previousSummary: CredentialAnalyticsSummary;
  dailyTrend: CredentialDailyPoint[];
  trendGranularity?: TrendGranularity;
  bySite: CredentialSiteRow[];
  periodFrom: string;
  periodTo: string;
  preset: PeriodPreset | null;
  scopePlanId: string | null;
  scopeType: string | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type AccessTokensFormOptions = {
  memberships: OrgMembershipOption[];
  plans: PlanOption[];
};

export type CredentialAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
};

export type CredentialAnalyticsParams = {
  orgId?: string;
  planId?: string;
  type?: CredentialType;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};

export type { CredentialStatus };
