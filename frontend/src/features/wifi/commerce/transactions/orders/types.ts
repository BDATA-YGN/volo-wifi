import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";
import type { ResellerPickerOption } from "@/features/wifi/commerce/partners/workspace/types";

export type SaleStatus = "DRAFT" | "PAID" | "VOID" | "REFUNDED";

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CARD" | "OTHER";

export type OrdersMode = "partner" | "org";

export type StationOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type OrderParty = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type OrderRecord = {
  id: string;
  orgId: string;
  orderNo: string;
  status: SaleStatus;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  note: string | null;
  soldAt: string | null;
  createdAt: string;
  updatedAt: string;
  resellerId: string | null;
  stationId: string | null;
  reseller: OrderParty | null;
  station: OrderParty | null;
  itemCount: number;
  paymentCount: number;
};

export type OrderItem = {
  id: string;
  planId: string;
  credentialId: string | null;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  createdAt: string;
  plan: {
    id: string;
    code: string;
    name: string;
    quotaType: string;
  };
  credential: {
    id: string;
    token: string | null;
    status: string;
  } | null;
};

export type OrderPayment = {
  id: string;
  method: PaymentMethod;
  amount: number;
  refNo: string | null;
  paidAt: string;
  note: string | null;
  createdAt: string;
};

export type OrderDetail = OrderRecord & {
  items: OrderItem[];
  payments: OrderPayment[];
};

export type OrdersFormOptions = {
  memberships: OrgMembershipOption[];
  resellers: ResellerPickerOption[];
  stations: StationOption[];
};

export type OrdersMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  mode?: OrdersMode;
  orgId?: string;
  resellerId?: string;
  requiresOrgSelection?: boolean;
  statusCounts?: Record<string, number>;
  paidRevenue?: number;
  todayOrders?: number;
  todayRevenue?: number;
  monthRevenue?: number;
  currency?: string;
  memberships?: OrgMembershipOption[];
  resellers?: ResellerPickerOption[];
};

export type OrdersListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  resellerId?: string;
  status?: SaleStatus;
  stationId?: string;
};
