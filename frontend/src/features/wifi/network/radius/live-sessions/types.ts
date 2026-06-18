export type RadiusAcctStatus = "START" | "INTERIM" | "STOP";

export type SessionView = "active" | "recent" | "all";

export type SessionOrg = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type SessionStation = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type SessionCredential = {
  id: string;
  type: string;
  status: string;
  token: string | null;
  username: string | null;
};

export type LiveSessionRecord = {
  id: string;
  orgId: string | null;
  stationId: string | null;
  credentialId: string | null;
  acctSessionId: string;
  userName: string | null;
  callingStationId: string | null;
  framedIpAddress: string | null;
  nasIpAddress: string | null;
  nasIdentifier: string | null;
  status: RadiusAcctStatus;
  startedAt: string;
  lastInterimAt: string | null;
  stoppedAt: string | null;
  inputBytes: string | null;
  outputBytes: string | null;
  totalBytes: string | null;
  sessionTimeSec: number | null;
  terminateCause: string | null;
  createdAt: string;
  updatedAt: string;
  org: SessionOrg | null;
  station: SessionStation | null;
  credential: SessionCredential | null;
};

export type LiveSessionsMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  view?: SessionView;
  activeCount?: number;
  interimCount?: number;
  stoppedToday?: number;
  stoppedRecent?: number;
  activeTotalBytes?: string;
  activeInputBytes?: string;
  activeOutputBytes?: string;
};

export type LiveSessionsFormOptions = {
  orgs: SessionOrg[];
  stations: SessionStation[];
};

export type LiveSessionsListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  stationId?: string;
  status?: RadiusAcctStatus;
  view?: SessionView;
  startedFrom?: string;
  startedTo?: string;
};
