import { Prisma, PrismaClient } from '@/generated/prisma/client';
import {
  appDayKey as utcDayKey,
  eachAppDay,
  previousAppPeriod,
  resolvePeriodFromPresetDays,
} from '@/utils/app-time';

export type SiteAnalyticsSummary = {
  siteCount: number;
  activeSiteCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  uniqueCredentials: number;
  totalBytes: number;
  totalSessionTimeSec: number;
};

export type SiteDailyPoint = {
  date: string;
  ordersCount: number;
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
  activeSites: number;
};

export type SiteRow = {
  stationId: string;
  code: string;
  name: string;
  status: string;
  location: string | null;
  stationSizeId: string;
  stationSizeCode: string;
  stationSizeName: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  uniqueCredentials: number;
  totalBytes: number;
};

export type SiteTierRow = {
  stationSizeId: string;
  code: string;
  name: string;
  siteCount: number;
  activeSiteCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
};

export type SiteAnalyticsPayload = {
  summary: SiteAnalyticsSummary;
  previousSummary: SiteAnalyticsSummary;
  dailyTrend: SiteDailyPoint[];
  bySite: SiteRow[];
  byTier: SiteTierRow[];
  dataSource: 'aggregated' | 'live';
};

type StationMeta = {
  id: string;
  code: string;
  name: string;
  status: string;
  location: string | null;
  stationSizeId: string;
  stationSizeCode: string;
  stationSizeName: string;
};

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
}

function bigintToNumber(value: bigint | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : 0;
}

function emptySummary(siteCount = 0): SiteAnalyticsSummary {
  return {
    siteCount,
    activeSiteCount: 0,
    ordersCount: 0,
    itemsCount: 0,
    revenue: 0,
    commission: 0,
    netRevenue: 0,
    sessionsCount: 0,
    uniqueCredentials: 0,
    totalBytes: 0,
    totalSessionTimeSec: 0,
  };
}

function mergeDailyTrend(
  salesByDay: Map<
    string,
    { ordersCount: number; revenue: number; commission: number; siteIds: Set<string> }
  >,
  usageByDay: Map<string, { sessionsCount: number; totalBytes: number; siteIds: Set<string> }>,
  periodFrom: Date,
  periodTo: Date
): SiteDailyPoint[] {
  const points: SiteDailyPoint[] = [];
  for (const cursor of eachAppDay(periodFrom, periodTo)) {
    const key = utcDayKey(cursor);
    const sales = salesByDay.get(key) ?? {
      ordersCount: 0,
      revenue: 0,
      commission: 0,
      siteIds: new Set<string>(),
    };
    const usage = usageByDay.get(key) ?? {
      sessionsCount: 0,
      totalBytes: 0,
      siteIds: new Set<string>(),
    };
    const activeSites = new Set([...sales.siteIds, ...usage.siteIds]);
    points.push({
      date: key,
      ordersCount: sales.ordersCount,
      revenue: sales.revenue,
      commission: sales.commission,
      sessionsCount: usage.sessionsCount,
      totalBytes: usage.totalBytes,
      activeSites: activeSites.size,
    });
  }

  return points;
}

export function resolvePeriodFromPreset(
  preset: string,
  periodTo: Date = new Date()
): { periodFrom: Date; periodTo: Date } {
  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  return resolvePeriodFromPresetDays(days, periodTo);
}

export function previousPeriod(periodFrom: Date, periodTo: Date): { from: Date; to: Date } {
  return previousAppPeriod(periodFrom, periodTo);
}

async function loadStationMeta(
  prisma: PrismaClient,
  orgId: string,
  stationSizeId?: string,
  stationId?: string
): Promise<StationMeta[]> {
  const stations = await prisma.wifiStation.findMany({
    where: {
      orgId,
      deletedAt: null,
      ...(stationSizeId ? { stationSizeId } : {}),
      ...(stationId ? { id: stationId } : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      location: true,
      stationSizeId: true,
      stationSize: { select: { code: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return stations.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    status: s.status,
    location: s.location,
    stationSizeId: s.stationSizeId,
    stationSizeCode: s.stationSize.code,
    stationSizeName: s.stationSize.name,
  }));
}

function buildByTier(bySite: SiteRow[]): SiteTierRow[] {
  const tierMap = new Map<string, SiteTierRow>();

  for (const site of bySite) {
    const tier =
      tierMap.get(site.stationSizeId) ??
      ({
        stationSizeId: site.stationSizeId,
        code: site.stationSizeCode,
        name: site.stationSizeName,
        siteCount: 0,
        activeSiteCount: 0,
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        sessionsCount: 0,
        totalBytes: 0,
      } as SiteTierRow);

    tier.siteCount += 1;
    if (site.ordersCount > 0 || site.sessionsCount > 0) tier.activeSiteCount += 1;
    tier.ordersCount += site.ordersCount;
    tier.itemsCount += site.itemsCount;
    tier.revenue += site.revenue;
    tier.commission += site.commission;
    tier.sessionsCount += site.sessionsCount;
    tier.totalBytes += site.totalBytes;
    tierMap.set(site.stationSizeId, tier);
  }

  return [...tierMap.values()]
    .map((t) => ({
      ...t,
      revenue: Math.round(t.revenue * 100) / 100,
      commission: Math.round(t.commission * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function mergeSiteRows(
  stations: StationMeta[],
  salesMap: Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >,
  usageMap: Map<
    string,
    { sessionsCount: number; uniqueCredentials: number; totalBytes: number }
  >
): SiteRow[] {
  return stations
    .map((station) => {
      const sales = salesMap.get(station.id) ?? {
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
      };
      const usage = usageMap.get(station.id) ?? {
        sessionsCount: 0,
        uniqueCredentials: 0,
        totalBytes: 0,
      };
      return {
        stationId: station.id,
        code: station.code,
        name: station.name,
        status: station.status,
        location: station.location,
        stationSizeId: station.stationSizeId,
        stationSizeCode: station.stationSizeCode,
        stationSizeName: station.stationSizeName,
        ordersCount: sales.ordersCount,
        itemsCount: sales.itemsCount,
        revenue: Math.round(sales.revenue * 100) / 100,
        commission: Math.round(sales.commission * 100) / 100,
        netRevenue: Math.round(sales.netRevenue * 100) / 100,
        sessionsCount: usage.sessionsCount,
        uniqueCredentials: usage.uniqueCredentials,
        totalBytes: usage.totalBytes,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.sessionsCount - a.sessionsCount);
}

async function aggregateFromDailyStats(
  prisma: PrismaClient,
  orgId: string,
  stationIds: string[],
  stations: StationMeta[],
  periodFrom: Date,
  periodTo: Date
): Promise<SiteAnalyticsPayload | null> {
  const stationIdSet = new Set(stationIds);
  const salesWhere =
    stationIds.length > 0
      ? { orgId, deletedAt: null, date: { gte: periodFrom, lte: periodTo }, stationId: { in: stationIds } }
      : { orgId, deletedAt: null, date: { gte: periodFrom, lte: periodTo }, stationId: { in: [] as string[] } };

  const [salesRows, usageRows] = await Promise.all([
    prisma.dailySalesStat.findMany({
      where: salesWhere,
      select: {
        date: true,
        stationId: true,
        ordersCount: true,
        itemsCount: true,
        revenue: true,
        commission: true,
        netRevenue: true,
      },
    }),
    prisma.dailyRadiusUsageStat.findMany({
      where: salesWhere,
      select: {
        date: true,
        stationId: true,
        sessionsCount: true,
        uniqueCredentials: true,
        totalBytes: true,
        totalSessionTimeSec: true,
      },
    }),
  ]);

  if (salesRows.length === 0 && usageRows.length === 0) {
    return null;
  }

  const salesMap = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >();
  const usageMap = new Map<
    string,
    { sessionsCount: number; uniqueCredentials: number; totalBytes: number }
  >();
  const salesByDay = new Map<
    string,
    { ordersCount: number; revenue: number; commission: number; siteIds: Set<string> }
  >();
  const usageByDay = new Map<
    string,
    { sessionsCount: number; totalBytes: number; siteIds: Set<string> }
  >();

  const summary = emptySummary(stations.length);

  for (const row of salesRows) {
    if (!row.stationId || !stationIdSet.has(row.stationId)) continue;

    summary.ordersCount += row.ordersCount;
    summary.itemsCount += row.itemsCount;
    summary.revenue += decimalToNumber(row.revenue);
    summary.commission += decimalToNumber(row.commission);
    summary.netRevenue += decimalToNumber(row.netRevenue);

    const site = salesMap.get(row.stationId) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    site.ordersCount += row.ordersCount;
    site.itemsCount += row.itemsCount;
    site.revenue += decimalToNumber(row.revenue);
    site.commission += decimalToNumber(row.commission);
    site.netRevenue += decimalToNumber(row.netRevenue);
    salesMap.set(row.stationId, site);

    const dayKey = utcDayKey(row.date);
    const day = salesByDay.get(dayKey) ?? {
      ordersCount: 0,
      revenue: 0,
      commission: 0,
      siteIds: new Set<string>(),
    };
    day.ordersCount += row.ordersCount;
    day.revenue += decimalToNumber(row.revenue);
    day.commission += decimalToNumber(row.commission);
    if (row.ordersCount > 0) day.siteIds.add(row.stationId);
    salesByDay.set(dayKey, day);
  }

  for (const row of usageRows) {
    if (!row.stationId || !stationIdSet.has(row.stationId)) continue;

    summary.sessionsCount += row.sessionsCount;
    summary.uniqueCredentials += row.uniqueCredentials;
    summary.totalBytes += bigintToNumber(row.totalBytes);
    summary.totalSessionTimeSec += row.totalSessionTimeSec;

    const site = usageMap.get(row.stationId) ?? {
      sessionsCount: 0,
      uniqueCredentials: 0,
      totalBytes: 0,
    };
    site.sessionsCount += row.sessionsCount;
    site.uniqueCredentials += row.uniqueCredentials;
    site.totalBytes += bigintToNumber(row.totalBytes);
    usageMap.set(row.stationId, site);

    const dayKey = utcDayKey(row.date);
    const day = usageByDay.get(dayKey) ?? {
      sessionsCount: 0,
      totalBytes: 0,
      siteIds: new Set<string>(),
    };
    day.sessionsCount += row.sessionsCount;
    day.totalBytes += bigintToNumber(row.totalBytes);
    if (row.sessionsCount > 0) day.siteIds.add(row.stationId);
    usageByDay.set(dayKey, day);
  }

  summary.revenue = Math.round(summary.revenue * 100) / 100;
  summary.commission = Math.round(summary.commission * 100) / 100;
  summary.netRevenue = Math.round(summary.netRevenue * 100) / 100;
  summary.activeSiteCount = mergeSiteRows(stations, salesMap, usageMap).filter(
    (s) => s.ordersCount > 0 || s.sessionsCount > 0
  ).length;

  const bySite = mergeSiteRows(stations, salesMap, usageMap);

  return {
    summary,
    previousSummary: emptySummary(stations.length),
    dailyTrend: mergeDailyTrend(salesByDay, usageByDay, periodFrom, periodTo),
    bySite,
    byTier: buildByTier(bySite),
    dataSource: 'aggregated',
  };
}

async function aggregateFromLiveOrders(
  prisma: PrismaClient,
  orgId: string,
  stationIds: string[],
  stations: StationMeta[],
  periodFrom: Date,
  periodTo: Date
): Promise<SiteAnalyticsPayload> {
  const stationIdSet = new Set(stationIds);

  const orders =
    stationIds.length === 0
      ? []
      : await prisma.saleOrder.findMany({
          where: {
            orgId,
            status: 'PAID',
            soldAt: { gte: periodFrom, lte: periodTo },
            stationId: { in: stationIds },
          },
          select: {
            total: true,
            soldAt: true,
            stationId: true,
            items: { select: { qty: true } },
          },
        });

  const salesMap = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >();
  const salesByDay = new Map<
    string,
    { ordersCount: number; revenue: number; commission: number; siteIds: Set<string> }
  >();

  for (const order of orders) {
    if (!order.soldAt || !order.stationId || !stationIdSet.has(order.stationId)) continue;
    const revenue = decimalToNumber(order.total);
    const itemsCount = order.items.reduce((s, i) => s + i.qty, 0);

    const site = salesMap.get(order.stationId) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    site.ordersCount += 1;
    site.itemsCount += itemsCount;
    site.revenue += revenue;
    site.netRevenue += revenue;
    salesMap.set(order.stationId, site);

    const dayKey = utcDayKey(order.soldAt);
    const day = salesByDay.get(dayKey) ?? {
      ordersCount: 0,
      revenue: 0,
      commission: 0,
      siteIds: new Set<string>(),
    };
    day.ordersCount += 1;
    day.revenue += revenue;
    day.siteIds.add(order.stationId);
    salesByDay.set(dayKey, day);
  }

  const bySite = mergeSiteRows(stations, salesMap, new Map());
  const summary = emptySummary(stations.length);
  summary.ordersCount = orders.length;
  summary.itemsCount = bySite.reduce((s, r) => s + r.itemsCount, 0);
  summary.revenue = bySite.reduce((s, r) => s + r.revenue, 0);
  summary.netRevenue = summary.revenue;
  summary.activeSiteCount = bySite.filter((s) => s.ordersCount > 0).length;

  return {
    summary,
    previousSummary: emptySummary(stations.length),
    dailyTrend: mergeDailyTrend(salesByDay, new Map(), periodFrom, periodTo),
    bySite,
    byTier: buildByTier(bySite),
    dataSource: 'live',
  };
}

export async function buildSiteAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: { stationId?: string; stationSizeId?: string }
): Promise<SiteAnalyticsPayload> {
  const stations = await loadStationMeta(
    prisma,
    orgId,
    filters?.stationSizeId,
    filters?.stationId
  );
  const stationIds = stations.map((s) => s.id);

  if (stations.length === 0) {
    return {
      summary: emptySummary(0),
      previousSummary: emptySummary(0),
      dailyTrend: mergeDailyTrend(new Map(), new Map(), periodFrom, periodTo),
      bySite: [],
      byTier: [],
      dataSource: 'aggregated',
    };
  }

  const aggregated = await aggregateFromDailyStats(
    prisma,
    orgId,
    stationIds,
    stations,
    periodFrom,
    periodTo
  );
  const current =
    aggregated ??
    (await aggregateFromLiveOrders(prisma, orgId, stationIds, stations, periodFrom, periodTo));

  const prev = previousPeriod(periodFrom, periodTo);
  const prevAggregated = await aggregateFromDailyStats(
    prisma,
    orgId,
    stationIds,
    stations,
    prev.from,
    prev.to
  );
  const previousSummary =
    prevAggregated?.summary ??
    (await aggregateFromLiveOrders(prisma, orgId, stationIds, stations, prev.from, prev.to))
      .summary;

  return {
    ...current,
    previousSummary,
  };
}
