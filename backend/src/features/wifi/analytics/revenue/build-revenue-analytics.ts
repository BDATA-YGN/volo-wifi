import { Prisma, PrismaClient } from '@/generated/prisma/client';
import {
  appCalendarMonthRange,
  appDayKey,
  appNow,
  eachAppDay,
} from '@/utils/app-time';
import type { TrendGranularity } from './constants';

const UNASSIGNED_TIER_ID = '__unassigned__';

export type RevenueAnalyticsSummary = {
  revenue: number;
  netRevenue: number;
  commission: number;
  ordersCount: number;
  itemsCount: number;
  avgOrderValue: number;
  siteCount: number;
  tierCount: number;
};

export type RevenueTrendPoint = {
  periodKey: string;
  label: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
};

export type RevenueSiteRow = {
  stationId: string;
  code: string;
  name: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
};

export type RevenueTierRow = {
  stationSizeId: string;
  code: string;
  name: string;
  sortOrder: number;
  siteCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sites: RevenueSiteRow[];
};

export type RevenueAnalyticsPayload = {
  summary: RevenueAnalyticsSummary;
  previousSummary: RevenueAnalyticsSummary;
  trend: RevenueTrendPoint[];
  trendGranularity: TrendGranularity;
  byTier: RevenueTierRow[];
  dataSource: 'aggregated' | 'live';
  month: string;
};

type Metrics = {
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
};

type StationMeta = {
  id: string;
  code: string;
  name: string;
  stationSizeId: string;
  stationSizeCode: string;
  stationSizeName: string;
  sortOrder: number;
};

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptyMetrics(): Metrics {
  return {
    ordersCount: 0,
    itemsCount: 0,
    revenue: 0,
    commission: 0,
    netRevenue: 0,
  };
}

function addMetrics(target: Metrics, add: Metrics): void {
  target.ordersCount += add.ordersCount;
  target.itemsCount += add.itemsCount;
  target.revenue += add.revenue;
  target.commission += add.commission;
  target.netRevenue += add.netRevenue;
}

function finalizeSummary(
  metrics: Metrics,
  siteCount: number,
  tierCount: number
): RevenueAnalyticsSummary {
  return {
    revenue: roundMoney(metrics.revenue),
    netRevenue: roundMoney(metrics.netRevenue),
    commission: roundMoney(metrics.commission),
    ordersCount: metrics.ordersCount,
    itemsCount: metrics.itemsCount,
    avgOrderValue: metrics.ordersCount > 0 ? roundMoney(metrics.revenue / metrics.ordersCount) : 0,
    siteCount,
    tierCount,
  };
}

export function resolveSelectedMonth(value?: string | null): {
  year: number;
  month: number;
  monthKey: string;
  periodFrom: Date;
  periodTo: Date;
} {
  const now = appNow();
  const match = value?.trim().match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  let year = now.year();
  let month = now.month() + 1;

  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    if (year > now.year() || (year === now.year() && month > now.month() + 1)) {
      year = now.year();
      month = now.month() + 1;
    }
  }

  const { from, to } = appCalendarMonthRange(year, month);
  return {
    year,
    month,
    monthKey: `${year}-${String(month).padStart(2, '0')}`,
    periodFrom: from,
    periodTo: to,
  };
}

export function previousCalendarMonthOf(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

async function loadStations(
  prisma: PrismaClient,
  orgId: string,
  allowedStationIds?: string[] | null
): Promise<StationMeta[]> {
  const stations = await prisma.wifiStation.findMany({
    where: {
      orgId,
      deletedAt: null,
      ...(allowedStationIds && allowedStationIds.length > 0 ? { id: { in: allowedStationIds } } : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      stationSizeId: true,
      stationSize: { select: { code: true, name: true, sortOrder: true } },
    },
    orderBy: { name: 'asc' },
  });

  return stations.map((station) => ({
    id: station.id,
    code: station.code,
    name: station.name,
    stationSizeId: station.stationSizeId ?? UNASSIGNED_TIER_ID,
    stationSizeCode: station.stationSize?.code ?? 'UNASSIGNED',
    stationSizeName: station.stationSize?.name ?? 'Unassigned',
    sortOrder: station.stationSize?.sortOrder ?? 999,
  }));
}

function dailySeries(buckets: Map<string, Metrics>, periodFrom: Date, periodTo: Date): RevenueTrendPoint[] {
  return eachAppDay(periodFrom, periodTo).map((day) => {
    const key = appDayKey(day);
    const bucket = buckets.get(key) ?? emptyMetrics();
    return {
      periodKey: key,
      label: key,
      ordersCount: bucket.ordersCount,
      itemsCount: bucket.itemsCount,
      revenue: roundMoney(bucket.revenue),
      commission: roundMoney(bucket.commission),
      netRevenue: roundMoney(bucket.netRevenue),
    };
  });
}

async function aggregateFromDailyStats(
  prisma: PrismaClient,
  orgId: string,
  stationIds: string[],
  periodFrom: Date,
  periodTo: Date
): Promise<{ byStation: Map<string, Metrics>; daily: Map<string, Metrics> } | null> {
  const rows = await prisma.dailySalesStat.findMany({
    where: {
      orgId,
      deletedAt: null,
      date: { gte: periodFrom, lte: periodTo },
      ...(stationIds.length > 0 ? { stationId: { in: stationIds } } : { stationId: { in: [] } }),
    },
    select: {
      date: true,
      stationId: true,
      ordersCount: true,
      itemsCount: true,
      revenue: true,
      commission: true,
      netRevenue: true,
    },
  });

  if (rows.length === 0) return null;

  const byStation = new Map<string, Metrics>();
  const daily = new Map<string, Metrics>();

  for (const row of rows) {
    const metrics: Metrics = {
      ordersCount: row.ordersCount,
      itemsCount: row.itemsCount,
      revenue: decimalToNumber(row.revenue),
      commission: decimalToNumber(row.commission),
      netRevenue: decimalToNumber(row.netRevenue),
    };

    if (row.stationId) {
      const station = byStation.get(row.stationId) ?? emptyMetrics();
      addMetrics(station, metrics);
      byStation.set(row.stationId, station);
    }

    const dayKey = appDayKey(row.date);
    const day = daily.get(dayKey) ?? emptyMetrics();
    addMetrics(day, metrics);
    daily.set(dayKey, day);
  }

  return { byStation, daily };
}

async function aggregateFromLiveOrders(
  prisma: PrismaClient,
  orgId: string,
  stationIds: string[],
  periodFrom: Date,
  periodTo: Date
): Promise<{ byStation: Map<string, Metrics>; daily: Map<string, Metrics> }> {
  const orders = await prisma.saleOrder.findMany({
    where: {
      orgId,
      status: 'PAID',
      soldAt: { gte: periodFrom, lte: periodTo },
      ...(stationIds.length > 0 ? { stationId: { in: stationIds } } : { stationId: { in: [] } }),
    },
    select: {
      stationId: true,
      soldAt: true,
      total: true,
      items: { select: { qty: true } },
    },
  });

  const byStation = new Map<string, Metrics>();
  const daily = new Map<string, Metrics>();

  for (const order of orders) {
    if (!order.soldAt) continue;
    const metrics: Metrics = {
      ordersCount: 1,
      itemsCount: order.items.reduce((sum, item) => sum + item.qty, 0),
      revenue: decimalToNumber(order.total),
      commission: 0,
      netRevenue: decimalToNumber(order.total),
    };

    if (order.stationId) {
      const station = byStation.get(order.stationId) ?? emptyMetrics();
      addMetrics(station, metrics);
      byStation.set(order.stationId, station);
    }

    const dayKey = appDayKey(order.soldAt);
    const day = daily.get(dayKey) ?? emptyMetrics();
    addMetrics(day, metrics);
    daily.set(dayKey, day);
  }

  return { byStation, daily };
}

function buildByTier(
  stations: StationMeta[],
  byStation: Map<string, Metrics>
): RevenueTierRow[] {
  const tierMap = new Map<string, RevenueTierRow>();

  for (const station of stations) {
    const metrics = byStation.get(station.id) ?? emptyMetrics();
    const tier =
      tierMap.get(station.stationSizeId) ??
      ({
        stationSizeId: station.stationSizeId,
        code: station.stationSizeCode,
        name: station.stationSizeName,
        sortOrder: station.sortOrder,
        siteCount: 0,
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
        sites: [],
      } satisfies RevenueTierRow);

    tier.siteCount += 1;
    tier.ordersCount += metrics.ordersCount;
    tier.itemsCount += metrics.itemsCount;
    tier.revenue += metrics.revenue;
    tier.commission += metrics.commission;
    tier.netRevenue += metrics.netRevenue;
    tier.sites.push({
      stationId: station.id,
      code: station.code,
      name: station.name,
      ordersCount: metrics.ordersCount,
      itemsCount: metrics.itemsCount,
      revenue: roundMoney(metrics.revenue),
      commission: roundMoney(metrics.commission),
      netRevenue: roundMoney(metrics.netRevenue),
    });
    tierMap.set(station.stationSizeId, tier);
  }

  return [...tierMap.values()]
    .map((tier) => ({
      ...tier,
      revenue: roundMoney(tier.revenue),
      commission: roundMoney(tier.commission),
      netRevenue: roundMoney(tier.netRevenue),
      sites: [...tier.sites].sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

async function loadMonthBreakdown(
  prisma: PrismaClient,
  orgId: string,
  stations: StationMeta[],
  periodFrom: Date,
  periodTo: Date
): Promise<{
  byStation: Map<string, Metrics>;
  daily: Map<string, Metrics>;
  dataSource: 'aggregated' | 'live';
}> {
  const stationIds = stations.map((station) => station.id);
  const aggregated = await aggregateFromDailyStats(prisma, orgId, stationIds, periodFrom, periodTo);
  if (aggregated) {
    return { ...aggregated, dataSource: 'aggregated' };
  }
  const live = await aggregateFromLiveOrders(prisma, orgId, stationIds, periodFrom, periodTo);
  return { ...live, dataSource: 'live' };
}

export async function buildRevenueAnalytics(
  prisma: PrismaClient,
  orgId: string,
  year: number,
  month: number,
  allowedStationIds?: string[] | null
): Promise<RevenueAnalyticsPayload> {
  const { from: periodFrom, to: periodTo } = appCalendarMonthRange(year, month);
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const stations = await loadStations(prisma, orgId, allowedStationIds);

  const current = await loadMonthBreakdown(prisma, orgId, stations, periodFrom, periodTo);
  const byTier = buildByTier(stations, current.byStation);

  const totals = emptyMetrics();
  for (const tier of byTier) {
    totals.ordersCount += tier.ordersCount;
    totals.itemsCount += tier.itemsCount;
    totals.revenue += tier.revenue;
    totals.commission += tier.commission;
    totals.netRevenue += tier.netRevenue;
  }

  const prev = previousCalendarMonthOf(year, month);
  const prevRange = appCalendarMonthRange(prev.year, prev.month);
  const previous = await loadMonthBreakdown(
    prisma,
    orgId,
    stations,
    prevRange.from,
    prevRange.to
  );
  const prevTotals = emptyMetrics();
  for (const metrics of previous.byStation.values()) {
    addMetrics(prevTotals, metrics);
  }

  return {
    summary: finalizeSummary(totals, stations.length, byTier.length),
    previousSummary: finalizeSummary(prevTotals, stations.length, byTier.length),
    trend: dailySeries(current.daily, periodFrom, periodTo),
    trendGranularity: 'daily',
    byTier,
    dataSource: current.dataSource,
    month: monthKey,
  };
}
