export type DeviceType = "ROUTER" | "AP" | "CONTROLLER" | "SWITCH";

export type NasDeviceOrg = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type NasDeviceStation = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type NasDeviceRecord = {
  id: string;
  orgId: string;
  stationId: string | null;
  type: DeviceType;
  vendor: string | null;
  model: string | null;
  serialNo: string | null;
  macAddr: string | null;
  ipAddr: string | null;
  note: string | null;
  isRadiusClient: boolean;
  radiusSecret?: string | null;
  hasRadiusSecret: boolean;
  nasShortname: string | null;
  nasType: string | null;
  nasPorts: number | null;
  nasServer: string | null;
  nasCommunity: string | null;
  createdAt: string;
  updatedAt: string;
  org: NasDeviceOrg;
  station: NasDeviceStation | null;
};

export type NasDevicesMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  typeCounts?: Partial<Record<DeviceType, number>>;
  radiusClientCount?: number;
  unassignedCount?: number;
};

export type NasDeviceFormValues = {
  orgId: string;
  stationId?: string | null;
  type: DeviceType;
  vendor?: string;
  model?: string;
  serialNo?: string;
  macAddr?: string;
  ipAddr?: string;
  note?: string;
  isRadiusClient: boolean;
  radiusSecret?: string;
  nasShortname?: string;
  nasType?: string;
  nasPorts?: number | null;
  nasServer?: string;
  nasCommunity?: string;
};

export type NasDevicesFormOptions = {
  orgs: NasDeviceOrg[];
  stations: NasDeviceStation[];
};

export type NasDevicesListParams = {
  page?: number;
  limit?: number;
  search?: string;
  orgId?: string;
  type?: DeviceType;
  isRadiusClient?: boolean;
  unassigned?: boolean;
};
