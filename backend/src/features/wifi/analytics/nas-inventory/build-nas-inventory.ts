import { Prisma, PrismaClient } from '@/generated/prisma/client';

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
  type: string;
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

export type NasInventoryPayload = {
  summary: NasInventorySummary;
  byType: NasInventoryTypeRow[];
  byVendor: NasInventoryVendorRow[];
  bySite: NasInventorySiteRow[];
  devices: NasInventoryDeviceRow[];
  generatedAt: string;
};

type NasFilters = {
  stationId?: string;
  type?: string;
  isRadiusClient?: boolean;
  unassigned?: boolean;
};

function emptySummary(): NasInventorySummary {
  return {
    deviceCount: 0,
    radiusClientCount: 0,
    assignedCount: 0,
    unassignedCount: 0,
    withIpCount: 0,
    withMacCount: 0,
    withSerialCount: 0,
    radiusMissingSecret: 0,
    radiusMissingNasId: 0,
    avgReadinessScore: 0,
  };
}

function readinessScore(row: {
  stationId: string | null;
  ipAddr: string | null;
  macAddr: string | null;
  serialNo: string | null;
  isRadiusClient: boolean;
  hasRadiusSecret: boolean;
  nasShortname: string | null;
}): number {
  const checks = [
    Boolean(row.stationId),
    Boolean(row.ipAddr?.trim()),
    Boolean(row.macAddr?.trim() || row.serialNo?.trim()),
  ];

  if (row.isRadiusClient) {
    checks.push(Boolean(row.hasRadiusSecret), Boolean(row.nasShortname?.trim()));
  }

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function buildDeviceWhere(orgId: string, filters?: NasFilters): Prisma.StationDeviceWhereInput {
  return {
    orgId,
    deletedAt: null,
    ...(filters?.stationId ? { stationId: filters.stationId } : {}),
    ...(filters?.type ? { type: filters.type as 'ROUTER' | 'AP' | 'CONTROLLER' | 'SWITCH' } : {}),
    ...(filters?.isRadiusClient !== undefined ? { isRadiusClient: filters.isRadiusClient } : {}),
    ...(filters?.unassigned ? { stationId: null } : {}),
  };
}

export async function buildNasInventory(
  prisma: PrismaClient,
  orgId: string,
  filters?: NasFilters
): Promise<NasInventoryPayload> {
  const devices = await prisma.stationDevice.findMany({
    where: buildDeviceWhere(orgId, filters),
    select: {
      id: true,
      type: true,
      vendor: true,
      model: true,
      serialNo: true,
      macAddr: true,
      ipAddr: true,
      stationId: true,
      isRadiusClient: true,
      radiusSecret: true,
      nasShortname: true,
      nasType: true,
      createdAt: true,
      updatedAt: true,
      station: { select: { code: true, name: true, status: true } },
    },
    orderBy: [{ isRadiusClient: 'desc' }, { type: 'asc' }, { createdAt: 'desc' }],
  });

  const summary = emptySummary();
  const typeMap = new Map<string, NasInventoryTypeRow>();
  const vendorMap = new Map<string, { count: number; radiusClientCount: number; models: Set<string> }>();
  const siteMap = new Map<string, NasInventorySiteRow>();
  const deviceRows: NasInventoryDeviceRow[] = [];
  let readinessTotal = 0;

  for (const device of devices) {
    summary.deviceCount += 1;
    if (device.isRadiusClient) summary.radiusClientCount += 1;
    if (device.stationId) summary.assignedCount += 1;
    else summary.unassignedCount += 1;
    if (device.ipAddr?.trim()) summary.withIpCount += 1;
    if (device.macAddr?.trim()) summary.withMacCount += 1;
    if (device.serialNo?.trim()) summary.withSerialCount += 1;
    if (device.isRadiusClient && !device.radiusSecret) summary.radiusMissingSecret += 1;
    if (device.isRadiusClient && !device.nasShortname?.trim()) summary.radiusMissingNasId += 1;

    const typeRow =
      typeMap.get(device.type) ??
      ({
        type: device.type,
        count: 0,
        radiusClientCount: 0,
        unassignedCount: 0,
      } as NasInventoryTypeRow);
    typeRow.count += 1;
    if (device.isRadiusClient) typeRow.radiusClientCount += 1;
    if (!device.stationId) typeRow.unassignedCount += 1;
    typeMap.set(device.type, typeRow);

    const vendorKey = device.vendor?.trim() || 'Unspecified';
    const vendorRow = vendorMap.get(vendorKey) ?? {
      count: 0,
      radiusClientCount: 0,
      models: new Set<string>(),
    };
    vendorRow.count += 1;
    if (device.isRadiusClient) vendorRow.radiusClientCount += 1;
    if (device.model?.trim()) vendorRow.models.add(device.model.trim());
    vendorMap.set(vendorKey, vendorRow);

    const siteKey = device.stationId ?? '__unassigned__';
    const siteRow =
      siteMap.get(siteKey) ??
      ({
        stationId: device.stationId,
        code: device.station?.code ?? null,
        name: device.station?.name ?? 'Unassigned',
        status: device.station?.status ?? null,
        deviceCount: 0,
        radiusClientCount: 0,
      } as NasInventorySiteRow);
    siteRow.deviceCount += 1;
    if (device.isRadiusClient) siteRow.radiusClientCount += 1;
    siteMap.set(siteKey, siteRow);

    const hasRadiusSecret = Boolean(device.radiusSecret);
    const score = readinessScore({
      stationId: device.stationId,
      ipAddr: device.ipAddr,
      macAddr: device.macAddr,
      serialNo: device.serialNo,
      isRadiusClient: device.isRadiusClient,
      hasRadiusSecret,
      nasShortname: device.nasShortname,
    });
    readinessTotal += score;

    deviceRows.push({
      deviceId: device.id,
      type: device.type,
      vendor: device.vendor,
      model: device.model,
      serialNo: device.serialNo,
      macAddr: device.macAddr,
      ipAddr: device.ipAddr,
      stationId: device.stationId,
      stationCode: device.station?.code ?? null,
      stationName: device.station?.name ?? null,
      stationStatus: device.station?.status ?? null,
      isRadiusClient: device.isRadiusClient,
      hasRadiusSecret,
      nasShortname: device.nasShortname,
      nasType: device.nasType,
      readinessScore: score,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    });
  }

  summary.avgReadinessScore =
    devices.length > 0 ? Math.round((readinessTotal / devices.length) * 10) / 10 : 0;

  const byType = [...typeMap.values()].sort((a, b) => b.count - a.count);
  const byVendor = [...vendorMap.entries()]
    .map(([vendor, row]) => ({
      vendor,
      count: row.count,
      radiusClientCount: row.radiusClientCount,
      modelCount: row.models.size,
    }))
    .sort((a, b) => b.count - a.count);

  const bySite = [...siteMap.values()].sort((a, b) => {
    if (a.stationId === null) return 1;
    if (b.stationId === null) return -1;
    return b.deviceCount - a.deviceCount;
  });

  return {
    summary,
    byType,
    byVendor,
    bySite,
    devices: deviceRows.sort((a, b) => a.readinessScore - b.readinessScore),
    generatedAt: new Date().toISOString(),
  };
}
