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
  quotaType?: string;
  timeAmount?: number | null;
  timeUnit?: string | null;
  dataMb?: number | null;
  maxDevices?: number | null;
  validityDays?: number | null;
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

/** One attribute row inside a policy group. */
export type PlanPolicyAttributeRow = {
  id?: string;
  phase: RadiusAttrPhase;
  attributeName: string;
  op: string;
  valueType: RadiusAttrValueType;
  value: string;
  priority: number;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * One list row = Plan + Vendor profile + 0..N sites (empty = global),
 * with many attribute rows underneath.
 */
export type PlanPolicyGroupRecord = {
  groupKey: string;
  policyBundleId: string;
  orgId: string;
  planId: string;
  vendorProfileId: string;
  /** @deprecated Prefer stationIds / wifiStations */
  wifiStationId: string | null;
  stationIds: string[];
  isGlobal: boolean;
  org: PolicyOrg;
  plan: PolicyPlan;
  vendorProfile: PolicyVendorProfile;
  /** @deprecated Prefer wifiStations */
  wifiStation: PolicyStation | null;
  wifiStations: PolicyStation[];
  attributeCount: number;
  attributes: PlanPolicyAttributeRow[];
  updatedAt: string;
};

export type PlanPoliciesMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  policyGroups?: number;
  attributeRows?: number;
  phaseCounts?: Partial<Record<RadiusAttrPhase, number>>;
  plansWithPolicies?: number;
};

export type PlanPolicyAttributeInput = {
  phase: RadiusAttrPhase;
  attributeName: string;
  op: string;
  valueType: RadiusAttrValueType;
  value: string;
  priority: number;
  note?: string;
};

export type PlanPolicyFormValues = {
  orgId: string;
  planId: string;
  vendorProfileId: string;
  /** Empty = global (all sites). */
  stationIds: string[];
  attributes: PlanPolicyAttributeInput[];
  policyBundleId?: string;
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
