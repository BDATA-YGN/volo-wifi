export type RadiusAttrPhase = "CHECK" | "REPLY";
export type RadiusAttrValueType = "STRING" | "INTEGER" | "IPADDR" | "DATE";

export type PolicyOrg = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type PolicyPlan = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type PolicyStation = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type PolicyVendorProfile = {
  id: string;
  name: string;
  vendor: string;
  model: string | null;
};

export type CatalogAttributeOption = {
  id: string;
  freeradiusName: string;
  displayName: string;
  op: string;
  valueType: string;
  defaultValue: string | null;
};

export type PlanPolicyRecord = {
  id: string;
  orgId: string;
  planId: string;
  wifiStationId: string | null;
  vendorProfileId: string;
  phase: RadiusAttrPhase;
  attributeName: string;
  op: string;
  valueType: RadiusAttrValueType;
  value: string;
  priority: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  org: PolicyOrg;
  plan: PolicyPlan;
  wifiStation: PolicyStation | null;
  vendorProfile: PolicyVendorProfile;
};

export type PlanPoliciesMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  phaseCounts?: Partial<Record<RadiusAttrPhase, number>>;
  plansWithPolicies?: number;
};

export type PlanPolicyFormValues = {
  orgId: string;
  planId: string;
  vendorProfileId: string;
  wifiStationId?: string | null;
  phase: RadiusAttrPhase;
  attributeName: string;
  op: string;
  valueType: RadiusAttrValueType;
  value: string;
  priority: number;
  note?: string;
};

export type PlanPoliciesFormOptions = {
  orgs: PolicyOrg[];
  plans: PolicyPlan[];
  stations: PolicyStation[];
  vendorProfiles: PolicyVendorProfile[];
  catalogAttributes: CatalogAttributeOption[];
};

export type PlanPoliciesListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  planId?: string;
  vendorProfileId?: string;
  phase?: RadiusAttrPhase;
  globalOnly?: boolean;
};
