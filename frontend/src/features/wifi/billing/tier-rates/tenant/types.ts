export type OrgSummary = {
  id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
  overrideCount?: number;
  orgLicense: {
    id: string;
    status: string;
    billingCycle: string;
    stationLimit: number;
    effectiveFrom: string;
  } | null;
};

export type StationSizeSummary = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type RateSnapshot = {
  id: string;
  unitPrice: string | number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive?: boolean;
  billingCycle?: string;
};

export type TenantOverrideRecord = {
  id: string;
  orgId: string;
  stationSizeId: string;
  billingCycle: string;
  unitPrice: string | number;
  currency: string;
  pricingSource: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stationSize: StationSizeSummary;
  org: Pick<OrgSummary, "id" | "code" | "name" | "currency">;
};

export type TenantRateMatrixRow = {
  stationSize: StationSizeSummary;
  platformRate: RateSnapshot | null;
  tenantOverride: TenantOverrideRecord | null;
  scheduledOverride: TenantOverrideRecord | null;
  effectiveRate: RateSnapshot | null;
  usesPlatformDefault: boolean;
};

export type TenantRatesOrgPayload = {
  org: OrgSummary;
  matrix: TenantRateMatrixRow[];
  history: TenantOverrideRecord[];
};

export type TenantRatesMeta = {
  orgId?: string;
  billingCycle?: string;
  tierCount?: number;
  overrideCount?: number;
  platformDefaultCount?: number;
  scheduledCount?: number;
  orgCount?: number;
};

export type TenantOverrideFormValues = {
  orgId: string;
  stationSizeId: string;
  unitPrice: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
};
