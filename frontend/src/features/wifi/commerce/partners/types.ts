import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type PartnerStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";

export type StationOption = {
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

export type PartnerPortalAccount = {
  username: string;
  fullName: string | null;
  lastLogin: string | null;
};

export type PartnerStation = {
  /** Present on detail payload; list fallback may omit it. */
  mappingId?: string;
  id: string;
  code: string;
  name: string;
  status: string;
  assignedAt?: string;
};

export type PartnerPlanEntitlement = {
  id: string;
  planId: string;
  isEnabled: boolean;
  plan: PlanOption;
};

export type PartnerRecord = {
  id: string;
  orgId: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: PartnerStatus;
  hasPortalAccount: boolean;
  portalAccount: PartnerPortalAccount | null;
  stationCount: number;
  enabledPlanCount: number;
  credentialCount: number;
  salesCount: number;
  stations: StationOption[];
  sellablePlans: PlanOption[];
  createdAt: string;
  updatedAt: string;
};

export type PartnerDetail = PartnerRecord & {
  stations: PartnerStation[];
  planEntitlements: PartnerPlanEntitlement[];
  stationIds: string[];
};

export type PlanEntitlementInput = {
  planId: string;
  isEnabled: boolean;
};

export type PartnerFormValues = {
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  status: PartnerStatus;
  stationIds: string[];
  planEntitlements: PlanEntitlementInput[];
  loginUsername?: string;
  loginPassword?: string;
};

export type PartnersFormOptions = {
  memberships: OrgMembershipOption[];
  stations: StationOption[];
  plans: PlanOption[];
  existingCodes: string[];
};

export type PartnersMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  activeCount?: number;
  suspendedCount?: number;
  disabledCount?: number;
  memberships?: OrgMembershipOption[];
};

export type PartnersListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  status?: PartnerStatus;
  stationId?: string;
};
