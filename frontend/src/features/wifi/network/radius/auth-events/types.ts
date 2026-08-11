export type AuthEventOutcome = "ACCEPT" | "REJECT" | "UNKNOWN";

export type AuthEventView = "recent" | "today" | "all";

export type AuthEventOrg = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type AuthEventStation = {
  id: string;
  code: string;
  name: string;
  status?: string;
};

export type AuthEventRecord = {
  id: string;
  username: string;
  reply: string | null;
  calledStationId: string | null;
  callingStationId: string | null;
  authdate: string;
  class: string | null;
  outcome: AuthEventOutcome;
  stationId?: string | null;
  station?: AuthEventStation | null;
  nasIdentifier?: string | null;
  clientIp?: string | null;
};

export type AuthEventsMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  view?: AuthEventView;
  acceptToday?: number;
  rejectToday?: number;
  recentCount?: number;
};

export type AuthEventsFormOptions = {
  orgs: AuthEventOrg[];
  stations: AuthEventStation[];
};

export type AuthEventsListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  stationId?: string;
  outcome?: AuthEventOutcome;
  view?: AuthEventView;
  authFrom?: string;
  authTo?: string;
};
