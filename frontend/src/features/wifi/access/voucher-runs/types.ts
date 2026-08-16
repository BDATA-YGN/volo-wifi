import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type OrgBrief = {
  id: string;
  code: string;
  name: string;
};

export type PlanBrief = {
  id: string;
  code: string;
  name: string;
  quotaType: string;
  isActive?: boolean;
  orgId?: string;
  org?: OrgBrief | null;
};

export type StationSizeBrief = {
  id: string;
  code: string;
  name: string;
  sortOrder?: number;
};

export type StationBrief = {
  id: string;
  code: string;
  name: string;
  status?: string;
  township?: string | null;
  stationSizeId?: string | null;
  stationSize?: StationSizeBrief | null;
  orgId?: string;
  org?: OrgBrief | null;
};

export type AdminBrief = {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
};

export type VoucherBatchRecord = {
  id: string;
  orgId: string;
  batchNo: string;
  planId: string;
  quantity: number;
  remainingQuantity: number;
  issued: number;
  redeemed: number;
  issuedTokenCount: number;
  canCancel: boolean;
  prefix: string | null;
  note: string | null;
  stationId: string | null;
  resellerId: string | null;
  createdByAdminId: string | null;
  tokenKey: string;
  createdAt: string;
  updatedAt: string;
  plan: PlanBrief;
  station: StationBrief | null;
  createdByAdmin: AdminBrief | null;
};

export type VoucherBatchDetail = VoucherBatchRecord & {
  credentialStats: Record<string, number>;
};

export type SitePlanBalanceRow = {
  planId: string;
  code: string;
  name: string;
  remaining: number;
  siteRemaining: number;
  sharedRemaining: number;
  runCount: number;
};

export type SitePlanBalance = {
  station: { id: string; code: string; name: string };
  plans: SitePlanBalanceRow[];
};

export type VoucherRunFormValues = {
  planId: string;
  quantity: number;
  batchNo?: string;
  note?: string;
  stationId: string;
};

export type VoucherRunsFormOptions = {
  memberships: OrgMembershipOption[];
  plans: PlanBrief[];
  stations: StationBrief[];
  stationSizes: StationSizeBrief[];
  canViewAllOrgs?: boolean;
  canSwitchOrg?: boolean;
  requiresOrgSelection?: boolean;
  scopedOrgId?: string | null;
};

export type VoucherRunsMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  runCount?: number;
  totalVouchers?: number;
  remainingVouchers?: number;
  memberships?: OrgMembershipOption[];
  canViewAllOrgs?: boolean;
  canSwitchOrg?: boolean;
  requiresOrgSelection?: boolean;
  scopedOrgId?: string | null;
};

export type VoucherRunsListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  planId?: string;
  stationId?: string;
  township?: string;
  stationSizeId?: string;
  dateFrom?: string;
  dateTo?: string;
  hasBalance?: boolean;
};
