import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";
import type { ResellerPickerOption } from "@/features/wifi/commerce/partners/workspace/types";
import type { SaleStatus } from "../orders/types";

export type { SaleStatus };

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CARD" | "OTHER";

export type PaymentsMode = "partner" | "org";

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

export type PaymentOrderSummary = {
  id: string;
  orderNo: string;
  status: string;
  total: number;
  currency: string;
  soldAt: string | null;
  resellerId: string | null;
  stationId: string | null;
  reseller: OrderParty | null;
  station: OrderParty | null;
  itemCount: number;
};

export type PaymentRecord = {
  id: string;
  orgId: string;
  orderId: string | null;
  method: PaymentMethod;
  amount: number;
  refNo: string | null;
  paidAt: string;
  note: string | null;
  createdAt: string;
  order: PaymentOrderSummary | null;
};

export type PaymentOrderItem = {
  id: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  plan: { id: string; code: string; name: string };
  credential: { id: string; token: string | null; status: string } | null;
};

export type PaymentOrderDetail = PaymentOrderSummary & {
  subtotal: number;
  discount: number;
  note: string | null;
  createdAt: string;
  items: PaymentOrderItem[];
};

export type PaymentDetail = PaymentRecord & {
  order: PaymentOrderDetail | null;
};

export type PaymentsFormOptions = {
  memberships: OrgMembershipOption[];
  resellers: ResellerPickerOption[];
  stations: StationOption[];
};

export type PaymentsMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  mode?: PaymentsMode;
  orgId?: string;
  resellerId?: string;
  requiresOrgSelection?: boolean;
  methodCounts?: Record<string, number>;
  methodAmounts?: Record<string, number>;
  todayCount?: number;
  todayAmount?: number;
  monthAmount?: number;
  refundedCount?: number;
  refundedTodayCount?: number;
  refundedTodayAmount?: number;
  refundedMonthAmount?: number;
  statusCounts?: Record<string, number>;
  currency?: string;
  memberships?: OrgMembershipOption[];
  resellers?: ResellerPickerOption[];
};

export type PaymentsListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  resellerId?: string;
  method?: PaymentMethod;
  stationId?: string;
  orderStatus?: SaleStatus;
};
