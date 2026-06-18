import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PeriodPreset = "7d" | "30d" | "90d";

export type WorkflowStatus =
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

export type ApprovalSummary = {
  settlementCount: number;
  pendingStationCount: number;
  pendingOrgCount: number;
  readyToPostCount: number;
  postedCount: number;
  rejectedCount: number;
  attestationsSigned: number;
  stationAttestationsSigned: number;
  orgAttestationsSigned: number;
  postingsSealed: number;
};

export type ApprovalWorkflowRow = {
  status: string;
  count: number;
};

export type ApprovalAttestationKindRow = {
  kind: string;
  signedCount: number;
  pendingCount: number;
};

export type ApprovalDailyPoint = {
  date: string;
  attestationsSigned: number;
  postingsSealed: number;
};

export type ApprovalQueueRow = {
  settlementId: string;
  status: WorkflowStatus;
  nextAction: string;
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
  variance: number | null;
  stationAttested: boolean;
  orgAttested: boolean;
  hasPosting: boolean;
  updatedAt: string;
};

export type AttestationEventRow = {
  attestationId: string;
  settlementId: string;
  kind: string;
  roleName: string | null;
  actorId: string | null;
  signedAt: string | null;
  note: string | null;
  resellerCode: string;
  stationCode: string;
  settlementStatus: string;
  periodStart: string;
};

export type PostingEventRow = {
  postingId: string;
  settlementId: string;
  kind: string;
  postedAt: string;
  postedBy: string | null;
  sealed: boolean;
  payloadHash: string;
  resellerCode: string;
  stationCode: string;
  settlementStatus: string;
  systemTotal: number;
  systemCurrency: string;
};

export type ApprovalTimelineItem = {
  id: string;
  type: "attestation" | "posting";
  kind: string;
  label: string;
  at: string;
  actorId: string | null;
  note: string | null;
  sealed?: boolean;
};

export type ApprovalDetail = {
  settlementId: string;
  status: WorkflowStatus;
  nextAction: string;
  periodStart: string;
  periodEnd: string;
  resellerCode: string;
  resellerName: string;
  stationCode: string;
  stationName: string;
  systemCurrency: string;
  systemTotal: number;
  declaredTotal: number | null;
  variance: number | null;
  stationAttested: boolean;
  orgAttested: boolean;
  hasPosting: boolean;
  timeline: ApprovalTimelineItem[];
};

export type ApprovalAnalyticsData = {
  summary: ApprovalSummary;
  previousSummary: ApprovalSummary;
  byWorkflow: ApprovalWorkflowRow[];
  byAttestationKind: ApprovalAttestationKindRow[];
  dailyTrend: ApprovalDailyPoint[];
  approvalQueue: ApprovalQueueRow[];
  attestations: AttestationEventRow[];
  postings: PostingEventRow[];
  periodFrom: string;
  periodTo: string;
  preset: PeriodPreset | null;
  scopeStationId: string | null;
  scopeResellerId: string | null;
  scopeStatus: string | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type ApprovalsFormOptions = {
  memberships: OrgMembershipOption[];
  stations: SiteOption[];
  resellers: PartnerOption[];
};

export type ApprovalAnalyticsMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
};

export type ApprovalAnalyticsParams = {
  orgId?: string;
  stationId?: string;
  resellerId?: string;
  status?: WorkflowStatus;
  preset?: PeriodPreset;
  periodFrom?: string;
  periodTo?: string;
};

export type ApprovalDetailParams = {
  orgId?: string;
  settlementId: string;
};
