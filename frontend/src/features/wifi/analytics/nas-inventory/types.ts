import type { OrgMembershipOption } from "@/features/wifi/tenant/access-control/types";

export type DeviceType = "ROUTER" | "AP" | "CONTROLLER" | "SWITCH";

export type SiteOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type NasInventorySummary = {
  deviceCount: number;
  radiusClientCount: number;
  assignedCount: number;
  unassignedCount: number;
  withIpCount: number;
  withMacCount: number;
  withSerialCount: number;
  radiusMissingSecret: number;
  radiusMissingNasId: number;
  avgReadinessScore: number;
};

export type NasInventoryTypeRow = {
  type: string;
  count: number;
  radiusClientCount: number;
  unassignedCount: number;
};

export type NasInventoryVendorRow = {
  vendor: string;
  count: number;
  radiusClientCount: number;
  modelCount: number;
};

export type NasInventorySiteRow = {
  stationId: string | null;
  code: string | null;
  name: string;
  status: string | null;
  deviceCount: number;
  radiusClientCount: number;
};

export type NasInventoryDeviceRow = {
  deviceId: string;
  type: DeviceType;
  vendor: string | null;
  model: string | null;
  serialNo: string | null;
  macAddr: string | null;
  ipAddr: string | null;
  stationId: string | null;
  stationCode: string | null;
  stationName: string | null;
  stationStatus: string | null;
  isRadiusClient: boolean;
  hasRadiusSecret: boolean;
  nasShortname: string | null;
  nasType: string | null;
  readinessScore: number;
  createdAt: string;
  updatedAt: string;
};

export type NasInventoryData = {
  summary: NasInventorySummary;
  byType: NasInventoryTypeRow[];
  byVendor: NasInventoryVendorRow[];
  bySite: NasInventorySiteRow[];
  devices: NasInventoryDeviceRow[];
  generatedAt: string;
  scopeStationId: string | null;
  scopeType: string | null;
  scopeRadiusClient: boolean | null;
  scopeUnassigned: boolean;
  org: { id: string; name: string; code: string; currency: string };
};

export type NasInventoryFormOptions = {
  memberships: OrgMembershipOption[];
  stations: SiteOption[];
};

export type NasInventoryMeta = {
  memberships?: OrgMembershipOption[];
  orgId?: string;
  requiresOrgSelection?: boolean;
};

export type NasInventoryParams = {
  orgId?: string;
  stationId?: string;
  type?: DeviceType;
  isRadiusClient?: boolean;
  unassigned?: boolean;
};
