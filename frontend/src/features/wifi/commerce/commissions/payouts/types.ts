import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PayoutStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED";

export type ResellerOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type PayoutRecord = {
  id: string;
  orgId: string;
  resellerId: string | null;
  periodFrom: string;
  periodTo: string;
  periodLabel: string;
  amount: number;
  status: PayoutStatus;
  paidAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  reseller: ResellerOption | null;
};

export type CommissionLine = {
  orderId: string;
  orderNo: string;
  planId: string;
  planCode: string;
  planName: string;
  qty: number;
  lineTotal: number;
  ruleType: "PERCENT" | "FIXED" | null;
  ruleValue: number | null;
  commission: number;
};

export type PayoutPreview = {
  orderCount: number;
  itemCount: number;
  grossSales: number;
  commissionAmount: number;
  currency: string;
  hasOverlap: boolean;
  lines: CommissionLine[];
};

export type PayoutDetail = PayoutRecord & {
  currency: string;
  breakdown: Omit<PayoutPreview, "hasOverlap" | "currency"> | null;
};

export type PayoutFormValues = {
  resellerId: string;
  period: [string, string];
  generate: boolean;
  amount: number;
  note: string;
};

export type PayoutStatusUpdate = {
  status: PayoutStatus;
  note?: string;
};

export type PayoutsFormOptions = {
  memberships: OrgMembershipOption[];
  resellers: ResellerOption[];
  currency: string;
};

export type PayoutsMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  pendingCount?: number;
  approvedCount?: number;
  paidCount?: number;
  outstandingAmount?: number;
  paidAmount?: number;
  currency?: string;
  memberships?: OrgMembershipOption[];
};

export type PayoutsListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  status?: PayoutStatus;
  resellerId?: string;
  periodFrom?: string;
  periodTo?: string;
};
