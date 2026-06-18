export type StationSizeSummary = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type PlatformTierRateRecord = {
  id: string;
  stationSizeId: string;
  billingCycle: string;
  unitPrice: string | number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stationSize: StationSizeSummary;
};

export type TierRateMatrixRow = {
  stationSize: StationSizeSummary;
  currentRate: PlatformTierRateRecord | null;
  scheduledRate: PlatformTierRateRecord | null;
};

export type PlatformRatesPayload = {
  matrix: TierRateMatrixRow[];
  history: PlatformTierRateRecord[];
};

export type PlatformRatesMeta = {
  billingCycle?: string;
  tierCount?: number;
  coveredCount?: number;
  missingCount?: number;
  missingTiers?: StationSizeSummary[];
  scheduledCount?: number;
};

export type PlatformRateFormValues = {
  stationSizeId: string;
  unitPrice: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
};
