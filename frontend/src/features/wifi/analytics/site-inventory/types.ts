import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type StationStatus = "ACTIVE" | "MAINTENANCE" | "DISABLED";

export type StationSizeOption = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
};

export type SiteOption = {
  id: string;
  code: string;
  name: string;
  status: string;
  stationSizeId: string;
};

export type SiteInventorySummary = {
  siteCount: number;
  activeCount: number;
  maintenanceCount: number;
  disabledCount: number;
  deviceCount: number;
  unassignedDeviceCount: number;
  radiusClientCount: number;
  sitesWithoutDevices: number;
  sitesWithoutRadiusIp: number;
  sitesWithoutVendorProfile: number;
};

export type SiteInventoryStatusRow = {
  status: string;
  count: number;
};

export type SiteInventoryTierRow = {
  stationSizeId: string;
  code: string;
  name: string;
  siteCount: number;
  activeCount: number;
  maintenanceCount: number;
  disabledCount: number;
  deviceCount: number;
  radiusClientCount: number;
};

export type SiteInventoryDeviceTypeRow = {
  type: string;
  count: number;
  radiusClientCount: number;
};

export type SiteInventorySiteRow = {
  stationId: string;
  code: string;
  name: string;
  status: string;
  location: string | null;
  address: string | null;
  stationSizeId: string;
  stationSizeCode: string;
  stationSizeName: string;
  deviceCount: number;
  radiusClientCount: number;
  hasRadiusClientIp: boolean;
  hasRadiusSecret: boolean;
  hasNasIdentifier: boolean;
  hasPortalUrl: boolean;
  hasVendorProfile: boolean;
  vendorProfileName: string | null;
  readinessScore: number;
  createdAt: string;
  updatedAt: string;
};

export type SiteInventoryData = {
  summary: SiteInventorySummary;
  byStatus: SiteInventoryStatusRow[];
  byTier: SiteInventoryTierRow[];
  byDeviceType: SiteInventoryDeviceTypeRow[];
  sites: SiteInventorySiteRow[];
  generatedAt: string;
  scopeStationId: string | null;
  scopeStationSizeId: string | null;
  scopeStatus: string | null;
  org: { id: string; name: string; code: string; currency: string };
};

export type SiteInventoryFormOptions = {
  memberships: OrgMembershipOption[];
  stationSizes: StationSizeOption[];
  stations: SiteOption[];
};

export type SiteInventoryMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
};

export type SiteInventoryParams = {
  orgId?: string;
  stationId?: string;
  stationSizeId?: string;
  status?: StationStatus;
};
