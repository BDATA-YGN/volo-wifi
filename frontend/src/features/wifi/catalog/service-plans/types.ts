import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PlanQuotaType = "TIME_ONLY" | "DATA_ONLY" | "TIME_AND_DATA";
export type UnitTime = "MINUTE" | "HOUR" | "DAY" | "MONTH";
export type PlanTimeUsageMode = "CUMULATIVE_SESSIONS" | "SINGLE_SESSION";

export type PlanCounts = {
  prices: number;
  credentials: number;
  voucherBatches: number;
  planAttributes: number;
  salesItems: number;
};

export type ServicePlanRecord = {
  id: string;
  orgId: string;
  code: string;
  name: string;
  description: string | null;
  /** Derived server-side from time/data limits (kept for filters & analytics). */
  quotaType: PlanQuotaType;
  timeAmount: number | null;
  timeUnit: UnitTime | null;
  dataMb: number | null;
  validityDays: number | null;
  maxDevices: number | null;
  timeUsageMode: PlanTimeUsageMode;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: PlanCounts;
};

export type ServicePlanFormValues = {
  code: string;
  name: string;
  description?: string;
  /** Allow-time amount; 0 = unlimited. */
  timeAmount: number;
  timeUnit?: UnitTime | null;
  /** Data limit in MB; 0 = unlimited. */
  dataMb: number;
  validityDays: number;
  maxDevices: number;
  timeUsageMode: PlanTimeUsageMode;
  isActive: boolean;
};

export type ServicePlansFormOptions = {
  memberships: OrgMembershipOption[];
  quotaTypes: PlanQuotaType[];
  timeUnits: UnitTime[];
  timeUsageModes: PlanTimeUsageMode[];
};

export type ServicePlansMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  activeCount?: number;
  timeOnlyCount?: number;
  dataOnlyCount?: number;
  comboCount?: number;
  memberships?: OrgMembershipOption[];
};

export type ServicePlansListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  quotaType?: PlanQuotaType;
  isActive?: "true" | "false";
};
