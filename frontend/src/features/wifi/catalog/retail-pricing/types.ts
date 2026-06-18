import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PriceBookScope = "DEFAULT" | "RESELLER" | "STATION";

export type ResellerOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type StationOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type PlanBrief = {
  id: string;
  code: string;
  name: string;
  quotaType: string;
  isActive: boolean;
};

export type PriceBookRecord = {
  id: string;
  orgId: string;
  name: string;
  isDefault: boolean;
  scope: PriceBookScope;
  resellerId: string | null;
  stationId: string | null;
  createdAt: string;
  updatedAt: string;
  reseller: ResellerOption | null;
  station: StationOption | null;
  _count: { prices: number };
};

export type PriceBookDetail = PriceBookRecord & {
  prices: PlanPriceRecord[];
};

export type PlanPriceRecord = {
  id: string;
  orgId: string;
  priceBookId: string;
  planId: string;
  retailPrice: string;
  costPrice: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  plan: PlanBrief;
};

export type PriceBookFormValues = {
  name: string;
  scope: PriceBookScope;
  resellerId?: string | null;
  stationId?: string | null;
};

export type PlanPriceFormValues = {
  priceBookId: string;
  planId: string;
  retailPrice: number;
  costPrice?: number | null;
  isActive: boolean;
};

export type PlanPriceUpdateValues = {
  retailPrice?: number;
  costPrice?: number | null;
  isActive?: boolean;
};

export type RetailPricingFormOptions = {
  memberships: OrgMembershipOption[];
  plans: PlanBrief[];
  resellers: ResellerOption[];
  stations: StationOption[];
};

export type RetailPricingMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  defaultCount?: number;
  resellerBooks?: number;
  siteBooks?: number;
  activePrices?: number;
  memberships?: OrgMembershipOption[];
};

export type RetailPricingListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  scope?: PriceBookScope;
};
