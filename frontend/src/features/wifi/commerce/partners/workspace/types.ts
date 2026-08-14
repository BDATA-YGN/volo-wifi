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

export type WorkspacePriceScope = "RESELLER" | "STATION" | "STATION_SIZE" | "DEFAULT";

export type WorkspacePlan = {
  entitlementId: string;
  id: string;
  code: string;
  name: string;
  quotaType: string;
  isActive: boolean;
  /** True when the winning price book (reseller → site → org) has an active price. */
  hasPricing?: boolean;
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
  station: { id: string; code: string; name: string } | null;
};

export type WorkspacePlanSales = {
  planId: string;
  planCode: string;
  planName: string;
  tokenCount: number;
  amount: number;
};

export type WorkspaceStationSales = {
  stationId: string;
  stationCode: string;
  stationName: string;
  tokenCount: number;
  amount: number;
  plans: WorkspacePlanSales[];
};

export type WorkspaceStats = {
  stationCount: number;
  planCount: number;
  credentialsSold: number;
  credentialsActive: number;
  credentialsIssued: number;
  ordersToday: number;
  revenueToday: number;
  tokensToday?: number;
  ordersMonth: number;
  revenueMonth: number;
  salesByPlanToday?: WorkspacePlanSales[];
  salesByStationToday?: WorkspaceStationSales[];
};

export type WorkspaceReadiness = {
  hasSites: boolean;
  hasPlans: boolean;
  hasPricing: boolean;
  /** Org-level default price book exists (site/reseller override not required). */
  hasDefaultBook?: boolean;
  pricedPlanCount: number;
  planCount?: number;
  /** Winning retail scope for this partner's mapped sites. */
  priceScope?: WorkspacePriceScope | null;
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
