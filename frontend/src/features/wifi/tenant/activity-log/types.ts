import type { OrgMembershipOption } from "../access-control/types";

export type ActivityLogView = "recent" | "today" | "all";

export type ActivityLogAdmin = {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
};

export type ActivityLogRecord = {
  id: string;
  orgId: string;
  adminId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  admin: ActivityLogAdmin | null;
};

export type ActivityLogFormOptions = {
  memberships: OrgMembershipOption[];
  actions: string[];
  entities: string[];
};

export type ActivityLogMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  view?: ActivityLogView;
  todayCount?: number;
  recentCount?: number;
  actorsToday?: number;
  memberships?: OrgMembershipOption[];
};

export type ActivityLogListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  view?: ActivityLogView;
  action?: string;
  entity?: string;
  createdFrom?: string;
  createdTo?: string;
};
