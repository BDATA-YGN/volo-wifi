import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type DiagnoseSeverity = "ok" | "info" | "warning" | "error";

export type DiagnoseVerdictCode =
  | "NOT_FOUND"
  | "UNUSED"
  | "PORTAL_WITHOUT_RADIUS_AUTH"
  | "AUTH_WITHOUT_ACCOUNTING"
  | "FIRST_SESSION_MISSING"
  | "DATA_CAP_DISCONNECT"
  | "INFLATED_SESSION_TIME"
  | "REJECTED"
  | "HEALTHY_ONLINE"
  | "HEALTHY_COMPLETED";

export type DiagnoseFinding = {
  code: string;
  severity: DiagnoseSeverity;
  title: string;
  detail: string;
};

export type DiagnoseVerdict = {
  code: DiagnoseVerdictCode;
  severity: DiagnoseSeverity;
  title: string;
  summary: string;
  actions: string[];
};

export type DiagnoseTimelineEvent = {
  at: string;
  kind: "captive" | "accept" | "reject" | "radius-start" | "radius-interim" | "radius-stop";
  label: string;
  detail: string | null;
};

export type DiagnoseToken = {
  id: string;
  token: string | null;
  username: string | null;
  status: string;
  soldAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  timeRemainingSec: number | null;
  dataRemainingMb: number | null;
  planQuotaSec: number | null;
  planDataMb: number | null;
  plan: { id: string; code: string; name: string; quotaType: string };
  station: { id: string; code: string; name: string; nasIdentifier: string | null } | null;
  reseller: { id: string; code: string; name: string } | null;
};

export type DiagnoseResult = {
  code: string;
  found: boolean;
  verdict: DiagnoseVerdict;
  findings: DiagnoseFinding[];
  counts: {
    captive: number;
    accept: number;
    reject: number;
    radiusSessions: number;
    archiveSessions: number;
  };
  token: DiagnoseToken | null;
  timeline: DiagnoseTimelineEvent[];
  captiveLogins: Array<{
    id: string;
    username: string;
    ip: string | null;
    mac: string | null;
    createdAt: string;
  }>;
  authEvents: Array<{
    id: string;
    username: string;
    reply: string | null;
    outcome: string;
    callingStationId: string | null;
    calledStationId: string | null;
    authdate: string;
  }>;
  radiusSessions: Array<{
    id: string;
    userName: string | null;
    status: string;
    acctSessionId: string;
    callingStationId: string | null;
    framedIpAddress: string | null;
    nasIpAddress: string | null;
    nasIdentifier: string | null;
    startedAt: string;
    stoppedAt: string | null;
    sessionTimeSec: number | null;
    wallSeconds: number;
    billedSeconds: number;
    inflated: boolean;
    inputBytes: number | null;
    outputBytes: number | null;
    totalBytes: number | null;
    terminateCause: string | null;
    archived: boolean;
  }>;
  relatedMacActivity: Array<{
    userName: string | null;
    status: string;
    acctSessionId: string;
    callingStationId: string | null;
    nasIdentifier: string | null;
    startedAt: string;
    stoppedAt: string | null;
    terminateCause: string | null;
  }>;
};

export type DiagnoseFormOptions = {
  memberships: OrgMembershipOption[];
};

export type DiagnoseMeta = {
  mode?: string;
  orgId?: string;
  resellerId?: string | null;
  partnerLocked?: boolean;
  requiresOrgSelection?: boolean;
  memberships?: OrgMembershipOption[];
};
