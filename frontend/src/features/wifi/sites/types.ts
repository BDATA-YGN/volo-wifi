import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type StationStatus = "ACTIVE" | "MAINTENANCE" | "DISABLED";

export type StationSizeOption = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  description: string | null;
};

export type VendorProfileOption = {
  id: string;
  name: string;
  vendor: string;
  model: string | null;
};

export type SiteStationSize = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type SiteVendorProfile = {
  id: string;
  name: string;
  vendor: string;
  model: string | null;
};

export type SiteCounts = {
  devices: number;
  credentials: number;
  sales: number;
  sessions: number;
};

export type SiteRecord = {
  id: string;
  orgId: string;
  code: string;
  name: string;
  location: string | null;
  township: string | null;
  address: string | null;
  status: StationStatus;
  stationSizeId: string;
  portalBaseUrl: string | null;
  nasIdentifier: string | null;
  radiusClientIp: string | null;
  nasMac: string | null;
  vlanId: string | null;
  radiusVendorProfileId: string | null;
  isBillable: boolean;
  hasRadiusSecret: boolean;
  createdAt: string;
  updatedAt: string;
  stationSize: SiteStationSize;
  radiusVendorProfile: SiteVendorProfile | null;
  _count: SiteCounts;
};

export type SiteFormValues = {
  code: string;
  name: string;
  location?: string;
  township?: string | null;
  address?: string;
  stationSizeId: string;
  status: StationStatus;
  portalBaseUrl?: string;
  nasIdentifier?: string;
  radiusClientIp?: string;
  nasMac?: string;
  radiusSecret?: string;
  vlanId?: string;
  radiusVendorProfileId?: string | null;
};

export type SitesLicenseMeta = {
  hasLicense: boolean;
  stationLimit: number;
  billableCount: number;
  remainingSlots: number;
  usagePercent: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
  status: string | null;
  billingCycle: string | null;
  currency: string | null;
};

export type SitesFormOptions = {
  memberships: OrgMembershipOption[];
  stationSizes: StationSizeOption[];
  vendorProfiles: VendorProfileOption[];
};

export type SitesMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  activeCount?: number;
  maintenanceCount?: number;
  disabledCount?: number;
  license?: SitesLicenseMeta;
  memberships?: OrgMembershipOption[];
};

export type SitesListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  status?: StationStatus;
  stationSizeId?: string;
  township?: string;
};
