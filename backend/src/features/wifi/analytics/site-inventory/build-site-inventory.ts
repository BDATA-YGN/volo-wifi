import { PrismaClient } from '@/generated/prisma/client';

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

export type SiteInventoryPayload = {
  summary: SiteInventorySummary;
  byStatus: SiteInventoryStatusRow[];
  byTier: SiteInventoryTierRow[];
  byDeviceType: SiteInventoryDeviceTypeRow[];
  sites: SiteInventorySiteRow[];
  generatedAt: string;
};

type InventoryFilters = {
  stationId?: string;
  stationSizeId?: string;
  status?: string;
};

function emptySummary(): SiteInventorySummary {
  return {
    siteCount: 0,
    activeCount: 0,
    maintenanceCount: 0,
    disabledCount: 0,
    deviceCount: 0,
    unassignedDeviceCount: 0,
    radiusClientCount: 0,
    sitesWithoutDevices: 0,
    sitesWithoutRadiusIp: 0,
    sitesWithoutVendorProfile: 0,
  };
}

function readinessScore(row: {
  deviceCount: number;
  hasRadiusClientIp: boolean;
  hasRadiusSecret: boolean;
  hasNasIdentifier: boolean;
  hasPortalUrl: boolean;
  hasVendorProfile: boolean;
  radiusClientCount: number;
}): number {
  const checks = [
    row.deviceCount > 0,
    row.radiusClientCount > 0,
    row.hasRadiusClientIp,
    row.hasRadiusSecret,
    row.hasNasIdentifier,
    row.hasPortalUrl,
    row.hasVendorProfile,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export async function buildSiteInventory(
  prisma: PrismaClient,
  orgId: string,
  filters?: InventoryFilters
): Promise<SiteInventoryPayload> {
  const stations = await prisma.wifiStation.findMany({
    where: {
      orgId,
      deletedAt: null,
      ...(filters?.stationId ? { id: filters.stationId } : {}),
      ...(filters?.stationSizeId ? { stationSizeId: filters.stationSizeId } : {}),
      ...(filters?.status ? { status: filters.status as 'ACTIVE' | 'MAINTENANCE' | 'DISABLED' } : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      location: true,
      address: true,
      stationSizeId: true,
      portalBaseUrl: true,
      nasIdentifier: true,
      radiusClientIp: true,
      radiusSecret: true,
      createdAt: true,
      updatedAt: true,
      stationSize: { select: { code: true, name: true } },
      radiusVendorProfile: { select: { name: true } },
      devices: {
        where: { deletedAt: null },
        select: { type: true, isRadiusClient: true },
      },
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });

  const [unassignedDevices, orgDevices] = await Promise.all([
    prisma.stationDevice.count({
      where: { orgId, deletedAt: null, stationId: null },
    }),
    prisma.stationDevice.findMany({
      where: { orgId, deletedAt: null },
      select: { type: true, isRadiusClient: true, stationId: true },
    }),
  ]);

  const summary = emptySummary();
  const statusMap = new Map<string, number>();
  const tierMap = new Map<string, SiteInventoryTierRow>();
  const deviceTypeMap = new Map<string, { count: number; radiusClientCount: number }>();
  const sites: SiteInventorySiteRow[] = [];

  for (const station of stations) {
    summary.siteCount += 1;
    if (station.status === 'ACTIVE') summary.activeCount += 1;
    if (station.status === 'MAINTENANCE') summary.maintenanceCount += 1;
    if (station.status === 'DISABLED') summary.disabledCount += 1;

    statusMap.set(station.status, (statusMap.get(station.status) ?? 0) + 1);

    const deviceCount = station.devices.length;
    const radiusClientCount = station.devices.filter((d) => d.isRadiusClient).length;
    const hasRadiusClientIp = Boolean(station.radiusClientIp?.trim());
    const hasRadiusSecret = Boolean(station.radiusSecret);
    const hasNasIdentifier = Boolean(station.nasIdentifier?.trim());
    const hasPortalUrl = Boolean(station.portalBaseUrl?.trim());
    const hasVendorProfile = Boolean(station.radiusVendorProfile);

    summary.radiusClientCount += radiusClientCount;
    if (deviceCount === 0) summary.sitesWithoutDevices += 1;
    if (!hasRadiusClientIp) summary.sitesWithoutRadiusIp += 1;
    if (!hasVendorProfile) summary.sitesWithoutVendorProfile += 1;

    const tier =
      tierMap.get(station.stationSizeId) ??
      ({
        stationSizeId: station.stationSizeId,
        code: station.stationSize.code,
        name: station.stationSize.name,
        siteCount: 0,
        activeCount: 0,
        maintenanceCount: 0,
        disabledCount: 0,
        deviceCount: 0,
        radiusClientCount: 0,
      } as SiteInventoryTierRow);

    tier.siteCount += 1;
    if (station.status === 'ACTIVE') tier.activeCount += 1;
    if (station.status === 'MAINTENANCE') tier.maintenanceCount += 1;
    if (station.status === 'DISABLED') tier.disabledCount += 1;
    tier.deviceCount += deviceCount;
    tier.radiusClientCount += radiusClientCount;
    tierMap.set(station.stationSizeId, tier);

    for (const device of station.devices) {
      const typeRow = deviceTypeMap.get(device.type) ?? { count: 0, radiusClientCount: 0 };
      typeRow.count += 1;
      if (device.isRadiusClient) typeRow.radiusClientCount += 1;
      deviceTypeMap.set(device.type, typeRow);
    }

    const siteRow: SiteInventorySiteRow = {
      stationId: station.id,
      code: station.code,
      name: station.name,
      status: station.status,
      location: station.location,
      address: station.address,
      stationSizeId: station.stationSizeId,
      stationSizeCode: station.stationSize.code,
      stationSizeName: station.stationSize.name,
      deviceCount,
      radiusClientCount,
      hasRadiusClientIp,
      hasRadiusSecret,
      hasNasIdentifier,
      hasPortalUrl,
      hasVendorProfile,
      vendorProfileName: station.radiusVendorProfile?.name ?? null,
      readinessScore: 0,
      createdAt: station.createdAt.toISOString(),
      updatedAt: station.updatedAt.toISOString(),
    };
    siteRow.readinessScore = readinessScore(siteRow);
    sites.push(siteRow);
  }

  summary.unassignedDeviceCount = unassignedDevices;

  for (const device of orgDevices) {
    if (device.stationId) continue;
    const typeRow = deviceTypeMap.get(device.type) ?? { count: 0, radiusClientCount: 0 };
    typeRow.count += 1;
    if (device.isRadiusClient) typeRow.radiusClientCount += 1;
    deviceTypeMap.set(device.type, typeRow);
  }

  summary.deviceCount = orgDevices.length;

  const byStatus = [...statusMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const byTier = [...tierMap.values()].sort(
    (a, b) => b.siteCount - a.siteCount || a.code.localeCompare(b.code)
  );

  const byDeviceType = [...deviceTypeMap.entries()]
    .map(([type, row]) => ({
      type,
      count: row.count,
      radiusClientCount: row.radiusClientCount,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    summary,
    byStatus,
    byTier,
    byDeviceType,
    sites: sites.sort((a, b) => b.readinessScore - a.readinessScore || a.name.localeCompare(b.name)),
    generatedAt: new Date().toISOString(),
  };
}
