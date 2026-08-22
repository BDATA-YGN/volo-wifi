import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";
import type { ResellerPickerOption } from "@/features/wifi/commerce/partners/workspace/types";

export type CredentialStatus =
  | "SOLD"
  | "ACTIVATED"
  | "CONSUMED"
  | "PAUSED"
  | "REVOKED"
  | "EXPIRED";

export type CredentialLifecycleAction =
  | "pause"
  | "unlock"
  | "allowNewDevice"
  | "clearSessions"
  | "restoreActivated"
  | "revertToSold";

export type CredentialActions = {
  canRevoke: boolean;
  canPause: boolean;
  canUnlock: boolean;
  canAllowNewDevice: boolean;
  canClearSessions: boolean;
  canRestoreActivated: boolean;
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
  /** Retail price per mapped site (Reseller → Site → Size → Org default). */
  pricesByStation?: Record<string, number>;
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
  /** Earliest captive portal or RADIUS session (falls back to activatedAt). */
  firstLoginAt: string | null;
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

export type RadiusAcctStatus = "START" | "INTERIM" | "STOP";

export type RadiusSessionPreview = {
  id: string;
  source: "hot" | "archive";
  status: RadiusAcctStatus | string;
  userName: string | null;
  callingStationId: string | null;
  framedIpAddress: string | null;
  nasIpAddress: string | null;
  nasIdentifier: string | null;
  startedAt: string;
  createdAt?: string;
  lastInterimAt: string | null;
  stoppedAt: string | null;
  sessionTimeSec: number | null;
  inputBytes: string | null;
  outputBytes: string | null;
  totalBytes: string | null;
  terminateCause: string | null;
};

export type TokenSessionsMeta = {
  captiveRetentionDays: number;
  radiusHotRetentionDays: number;
  radiusArchiveRetentionDays: number;
  emptyStateMessage: string | null;
};

export type AccessTokenDetail = AccessTokenRecord & {
  captiveSessions: CaptiveSessionPreview[];
  captiveSessionsTotal: number;
  captiveSessionsTruncated: boolean;
  radiusSessions: RadiusSessionPreview[];
  radiusSessionsTotal: number;
  radiusSessionsTruncated: boolean;
  radiusSessionsHotTotal: number;
  radiusSessionsArchiveTotal: number;
  sessionsMeta: TokenSessionsMeta | null;
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
  resellerId?: string | null;
  partnerLocked?: boolean;
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
