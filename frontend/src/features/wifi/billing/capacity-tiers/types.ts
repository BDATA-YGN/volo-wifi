export type CapacityTierRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    stations: number;
    globalLicensePrices: number;
    orgLicensePrices: number;
  };
};

export type CapacityTierFormValues = {
  code: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
};

export type CapacityTiersMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  activeCount?: number;
  stationCount?: number;
};
