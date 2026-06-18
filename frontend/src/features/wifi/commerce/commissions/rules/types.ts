import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type CommissionType = "PERCENT" | "FIXED";

export type ResellerOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type PlanOption = {
  id: string;
  code: string;
  name: string;
  quotaType: string;
  isActive: boolean;
};

export type CommissionRuleRecord = {
  id: string;
  orgId: string;
  resellerId: string | null;
  planId: string | null;
  type: CommissionType;
  value: number;
  valuePercent: number | null;
  isActive: boolean;
  scopeLabel: string;
  createdAt: string;
  updatedAt: string;
  reseller: ResellerOption | null;
  plan: PlanOption | null;
};

export type CommissionRuleFormValues = {
  resellerId: string | null;
  planId: string | null;
  type: CommissionType;
  percentValue: number;
  fixedValue: number;
  isActive: boolean;
};

export type RulesFormOptions = {
  memberships: OrgMembershipOption[];
  resellers: ResellerOption[];
  plans: PlanOption[];
  currency: string;
};

export type RulesMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  activeCount?: number;
  percentCount?: number;
  fixedCount?: number;
  defaultCount?: number;
  memberships?: OrgMembershipOption[];
};

export type RulesListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  type?: CommissionType;
  resellerId?: string;
  planId?: string;
  isActive?: boolean;
};
