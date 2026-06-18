import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PlanBrief = {
  id: string;
  code: string;
  name: string;
  quotaType: string;
  isActive?: boolean;
};

export type StationBrief = {
  id: string;
  code: string;
  name: string;
  status?: string;
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
  tokenKey: string;
  createdAt: string;
  updatedAt: string;
  plan: PlanBrief;
  station: StationBrief | null;
};

export type VoucherCredentialPreview = {
  id: string;
  token: string;
  status: string;
  createdAt: string;
  soldAt: string | null;
  activatedAt: string | null;
  revokedAt: string | null;
};

export type VoucherBatchDetail = VoucherBatchRecord & {
  credentialStats: Record<string, number>;
  credentials: VoucherCredentialPreview[];
  credentialsTotal: number;
  credentialsTruncated: boolean;
};

export type VoucherRunFormValues = {
  planId: string;
  quantity: number;
  batchNo?: string;
  prefix?: string;
  note?: string;
  stationId?: string | null;
};

export type VoucherRunsFormOptions = {
  memberships: OrgMembershipOption[];
  plans: PlanBrief[];
  stations: StationBrief[];
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
};

export type VoucherRunsListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  planId?: string;
  stationId?: string;
};
