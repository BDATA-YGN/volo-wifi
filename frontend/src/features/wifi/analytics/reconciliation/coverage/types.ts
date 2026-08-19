import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type EligibilityStatus = "SEALED" | "GAP" | "UNSEALED" | "NO_COVERAGE";

export type CoverageTab = "stats" | "sites" | "partners" | "ledger";

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

export type CoverageSummary = {
  scopeCount: number;
  activePaymentScopes: number;
  sealedCount: number;
  gapCount: number;
  unsealedCount: number;
  noCoverageCount: number;
  purgeEligibleCount: number;
  atRiskCount: number;
  sealedPct: number;
  avgGapDays: number;
  totalUncoveredPayments: number;
  earliestCoveredAt: string | null;
  latestCoveredAt: string | null;
};

export type CoverageEligibilityRow = {
  status: EligibilityStatus;
  count: number;
};

export type CoverageLagBucket = {
  bucket: string;
  count: number;
};

export type CoveragePartnerRow = {
  resellerId: string;
  code: string;
  name: string;
  scopeCount: number;
  sealedCount: number;
  gapCount: number;
  unsealedCount: number;
  noCoverageCount: number;
  uncoveredPaymentCount: number;
  sealedPct: number;
  avgGapDays: number;
};

export type CoverageSiteRow = {
  stationId: string;
  code: string;
  name: string;
  scopeCount: number;
  sealedCount: number;
  gapCount: number;
  unsealedCount: number;
  noCoverageCount: number;
  uncoveredPaymentCount: number;
  sealedPct: number;
  avgGapDays: number;
};

export type CoverageScopeRow = {
  coverageId: string | null;
  resellerId: string;
  resellerCode: string;
  resellerName: string;
  stationId: string;
  stationCode: string;
  stationName: string;
  maxCoveredPaidAt: string | null;
  lastPostingId: string | null;
  lastPostedAt: string | null;
  postingSealed: boolean | null;
  latestPaymentAt: string | null;
  paymentCount: number;
  uncoveredPaymentCount: number;
  gapDays: number;
  eligibility: EligibilityStatus;
  updatedAt: string | null;
};

export type UncoveredPaymentRow = {
  paymentId: string;
  paidAt: string;
  amount: number;
  method: string;
  orderNo: string | null;
};

export type CoverageDetail = {
  coverageId: string | null;
  resellerId: string;
  resellerCode: string;
  resellerName: string;
  stationId: string;
  stationCode: string;
  stationName: string;
  maxCoveredPaidAt: string | null;
  lastPostingId: string | null;
  lastPostedAt: string | null;
  postedBy: string | null;
  postingSealed: boolean | null;
  payloadHash: string | null;
  latestPaymentAt: string | null;
  paymentCount: number;
  uncoveredPaymentCount: number;
  gapDays: number;
  eligibility: EligibilityStatus;
  updatedAt: string | null;
  createdAt: string | null;
  uncoveredPayments: UncoveredPaymentRow[];
};

export type CoverageAnalyticsData = {
  summary: CoverageSummary;
  byEligibility: CoverageEligibilityRow[];
  lagBuckets: CoverageLagBucket[];
  byPartner: CoveragePartnerRow[];
  bySite: CoverageSiteRow[];
  scopes: CoverageScopeRow[];
  generatedAt: string;
  scopeStationId: string | null;
  scopeResellerId: string | null;
  scopeEligibility: string | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type CoverageFormOptions = {
  memberships: OrgMembershipOption[];
  stations: SiteOption[];
  resellers: PartnerOption[];
  canSwitchOrg?: boolean;
  requiresOrgSelection?: boolean;
};

export type CoverageAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
  canSwitchOrg?: boolean;
};

export type CoverageAnalyticsParams = {
  orgId?: string;
  stationId?: string;
  resellerId?: string;
  eligibility?: EligibilityStatus;
};

export type CoverageDetailParams = {
  orgId?: string;
  coverageId: string;
};
