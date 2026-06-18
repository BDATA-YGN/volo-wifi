import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";
import type { ResellerPickerOption } from "@/features/wifi/commerce/partners/workspace/types";

export type CredentialStatus =
  | "NEW"
  | "SOLD"
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED"
  | "CONSUMED"
  | "ACTIVATED"
  | "IN_USE"
  | "PAUSED";

export type CredentialLifecycleAction = "pause" | "unlock" | "revertToSold";

export type CredentialActions = {
  canRevoke: boolean;
  canPause: boolean;
  canUnlock: boolean;
  canRevertToSold: boolean;
  revokeBlockedReason?: string;
};

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CARD" | "OTHER";

export type WorkspaceMode = "partner" | "preview";

export type SellableStation = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type SellablePlan = {
  id: string;
  code: string;
  name: string;
  quotaType: string;
  isActive: boolean;
  unitPrice: number | null;
  hasPricing: boolean;
};

export type SellableCatalog = {
  currency: string;
  stations: SellableStation[];
  plans: SellablePlan[];
  canSell: boolean;
};

export type AccessTokenSale = {
  itemId: string;
  unitPrice: number;
  lineTotal: number;
  order: {
    id: string;
    orderNo: string;
    status: string;
    total: number;
    currency: string;
    soldAt: string | null;
  };
};

export type AccessTokenRecord = {
  id: string;
  orgId: string;
  type: string;
  status: CredentialStatus;
  token: string | null;
  planId: string;
  stationId: string | null;
  resellerId: string | null;
  plan: {
    id: string;
    code: string;
    name: string;
    quotaType: string;
    isActive: boolean;
  };
  station: {
    id: string;
    code: string;
    name: string;
    status: string;
  } | null;
  reseller: {
    id: string;
    code: string;
    name: string;
    status: string;
  } | null;
  soldAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  captiveSessionCount: number;
  actions?: CredentialActions;
  sale: AccessTokenSale | null;
};

export type CaptiveSessionPreview = {
  id: string;
  username: string;
  ip: string | null;
  mac: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccessTokenDetail = AccessTokenRecord & {
  captiveSessions: CaptiveSessionPreview[];
  captiveSessionsTotal: number;
  captiveSessionsTruncated: boolean;
};

export type IssueTokenFormValues = {
  planId: string;
  stationId: string;
  quantity: number;
  paymentMethod: PaymentMethod;
  discount: number;
  note?: string;
};

export type IssueTokenResult = {
  order: {
    id: string;
    orderNo: string;
    total: number;
    currency: string;
  };
  credentials: AccessTokenRecord[];
};

export type AccessTokensFormOptions = {
  memberships: OrgMembershipOption[];
  resellers: ResellerPickerOption[];
  catalog: SellableCatalog | null;
};

export type AccessTokensMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  mode?: WorkspaceMode;
  orgId?: string;
  resellerId?: string;
  requiresOrgSelection?: boolean;
  requiresResellerSelection?: boolean;
  statusCounts?: Record<string, number>;
  todayOrders?: number;
  todayRevenue?: number;
  revokeWindowMinutes?: number;
  catalog?: SellableCatalog;
  memberships?: OrgMembershipOption[];
  resellers?: ResellerPickerOption[];
};

export type AccessTokensListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  resellerId?: string;
  status?: CredentialStatus;
  planId?: string;
  stationId?: string;
};
