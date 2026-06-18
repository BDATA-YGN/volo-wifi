import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";
import type { PartnerStatus } from "@/features/wifi/commerce/partners/types";

export type WorkspaceMode = "partner" | "preview";

export type ResellerPickerOption = {
  id: string;
  code: string;
  name: string;
  status: PartnerStatus;
};

export type WorkspaceStation = {
  mappingId: string;
  id: string;
  code: string;
  name: string;
  status: string;
  location: string | null;
  assignedAt: string;
};

export type WorkspacePlan = {
  entitlementId: string;
  id: string;
  code: string;
  name: string;
  quotaType: string;
  isActive: boolean;
};

export type WorkspaceRecentOrder = {
  id: string;
  orderNo: string;
  status: string;
  total: number;
  currency: string;
  soldAt: string | null;
  createdAt: string;
  itemCount: number;
  station: { code: string; name: string } | null;
};

export type WorkspaceStats = {
  stationCount: number;
  planCount: number;
  credentialsNew: number;
  credentialsSold: number;
  credentialsActive: number;
  credentialsIssued: number;
  ordersToday: number;
  revenueToday: number;
  ordersMonth: number;
  revenueMonth: number;
};

export type WorkspaceReadiness = {
  hasSites: boolean;
  hasPlans: boolean;
  hasPricing: boolean;
  pricedPlanCount: number;
  canSellTokens: boolean;
};

export type WorkspaceDashboard = {
  mode: WorkspaceMode;
  reseller: {
    id: string;
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    status: PartnerStatus;
    hasPortalAccount: boolean;
    createdAt: string;
  };
  org: {
    id: string;
    code: string;
    name: string;
    currency: string;
  };
  stations: WorkspaceStation[];
  plans: WorkspacePlan[];
  stats: WorkspaceStats;
  readiness: WorkspaceReadiness;
  recentOrders: WorkspaceRecentOrder[];
};

export type WorkspaceFormOptions = {
  memberships: OrgMembershipOption[];
  resellers: ResellerPickerOption[];
};

export type WorkspaceMeta = {
  mode?: WorkspaceMode;
  orgId?: string;
  resellerId?: string;
  requiresOrgSelection?: boolean;
  requiresResellerSelection?: boolean;
  memberships?: OrgMembershipOption[];
  resellers?: ResellerPickerOption[];
};

export type WorkspaceParams = {
  orgId?: string;
  resellerId?: string;
};
