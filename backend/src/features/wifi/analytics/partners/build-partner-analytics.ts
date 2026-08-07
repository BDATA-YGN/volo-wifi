import { Prisma, PrismaClient } from '@/generated/prisma/client';
import {
  appDayKey as utcDayKey,
  eachAppDay,
  previousAppPeriod,
  resolvePeriodFromPresetDays,
} from '@/utils/app-time';

export type PartnerAnalyticsSummary = {
  partnerCount: number;
  activePartnerCount: number;
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

export type PartnerDailyPoint = {
  date: string;
  ordersCount: number;
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
  activePartners: number;
};

export type PartnerRow = {
  resellerId: string;
  code: string;
  name: string;
  status: string;
  stationCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  uniqueCredentials: number;
  totalBytes: number;
};

export type PartnerAnalyticsPayload = {
  summary: PartnerAnalyticsSummary;
  previousSummary: PartnerAnalyticsSummary;
  dailyTrend: PartnerDailyPoint[];
  byPartner: PartnerRow[];
  dataSource: 'aggregated' | 'live';
};

type ResellerMeta = {
  id: string;
  code: string;
  name: string;
  status: string;
  stationCount: number;
};

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
}

function bigintToNumber(value: bigint | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : 0;
}

function emptySummary(partnerCount = 0): PartnerAnalyticsSummary {
  return {
    partnerCount,
    activePartnerCount: 0,
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
    { ordersCount: number; revenue: number; commission: number; partnerIds: Set<string> }
  >,
  usageByDay: Map<string, { sessionsCount: number; totalBytes: number; partnerIds: Set<string> }>,
  periodFrom: Date,
  periodTo: Date
): PartnerDailyPoint[] {
  const points: PartnerDailyPoint[] = [];
  for (const cursor of eachAppDay(periodFrom, periodTo)) {
    const key = utcDayKey(cursor);
    const sales = salesByDay.get(key) ?? {
      ordersCount: 0,
      revenue: 0,
      commission: 0,
      partnerIds: new Set<string>(),
    };
    const usage = usageByDay.get(key) ?? {
      sessionsCount: 0,
      totalBytes: 0,
      partnerIds: new Set<string>(),
    };
    const activePartners = new Set([...sales.partnerIds, ...usage.partnerIds]);
    points.push({
      date: key,
      ordersCount: sales.ordersCount,
      revenue: sales.revenue,
      commission: sales.commission,
      sessionsCount: usage.sessionsCount,
      totalBytes: usage.totalBytes,
      activePartners: activePartners.size,
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

async function loadResellerMeta(
  prisma: PrismaClient,
  orgId: string,
  resellerId?: string
): Promise<ResellerMeta[]> {
  const resellers = await prisma.reseller.findMany({
    where: {
      orgId,
      deletedAt: null,
      ...(resellerId ? { id: resellerId } : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      _count: {
        select: {
          resellerStations: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return resellers.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    status: r.status,
    stationCount: r._count.resellerStations,
  }));
}

function mergePartnerRows(
  resellers: ResellerMeta[],
  salesMap: Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >,
  usageMap: Map<string, { sessionsCount: number; uniqueCredentials: number; totalBytes: number }>
): PartnerRow[] {
  return resellers
    .map((reseller) => {
      const sales = salesMap.get(reseller.id) ?? {
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
      };
      const usage = usageMap.get(reseller.id) ?? {
        sessionsCount: 0,
        uniqueCredentials: 0,
        totalBytes: 0,
      };
      return {
        resellerId: reseller.id,
        code: reseller.code,
        name: reseller.name,
        status: reseller.status,
        stationCount: reseller.stationCount,
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
    .sort((a, b) => b.revenue - a.revenue || b.commission - a.commission);
}

async function aggregateFromDailyStats(
  prisma: PrismaClient,
  orgId: string,
  resellerIds: string[],
  resellers: ResellerMeta[],
  periodFrom: Date,
  periodTo: Date
): Promise<PartnerAnalyticsPayload | null> {
  const resellerIdSet = new Set(resellerIds);
  const baseWhere =
    resellerIds.length > 0
      ? {
          orgId,
          deletedAt: null,
          date: { gte: periodFrom, lte: periodTo },
          resellerId: { in: resellerIds },
        }
      : {
          orgId,
          deletedAt: null,
          date: { gte: periodFrom, lte: periodTo },
          resellerId: { in: [] as string[] },
        };

  const [salesRows, usageRows] = await Promise.all([
    prisma.dailySalesStat.findMany({
      where: baseWhere,
      select: {
        date: true,
        resellerId: true,
        ordersCount: true,
        itemsCount: true,
        revenue: true,
        commission: true,
        netRevenue: true,
      },
    }),
    prisma.dailyRadiusUsageStat.findMany({
      where: baseWhere,
      select: {
        date: true,
        resellerId: true,
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
    { ordersCount: number; revenue: number; commission: number; partnerIds: Set<string> }
  >();
  const usageByDay = new Map<
    string,
    { sessionsCount: number; totalBytes: number; partnerIds: Set<string> }
  >();

  const summary = emptySummary(resellers.length);

  for (const row of salesRows) {
    if (!row.resellerId || !resellerIdSet.has(row.resellerId)) continue;

    summary.ordersCount += row.ordersCount;
    summary.itemsCount += row.itemsCount;
    summary.revenue += decimalToNumber(row.revenue);
    summary.commission += decimalToNumber(row.commission);
    summary.netRevenue += decimalToNumber(row.netRevenue);

    const partner = salesMap.get(row.resellerId) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    partner.ordersCount += row.ordersCount;
    partner.itemsCount += row.itemsCount;
    partner.revenue += decimalToNumber(row.revenue);
    partner.commission += decimalToNumber(row.commission);
    partner.netRevenue += decimalToNumber(row.netRevenue);
    salesMap.set(row.resellerId, partner);

    const dayKey = utcDayKey(row.date);
    const day = salesByDay.get(dayKey) ?? {
      ordersCount: 0,
      revenue: 0,
      commission: 0,
      partnerIds: new Set<string>(),
    };
    day.ordersCount += row.ordersCount;
    day.revenue += decimalToNumber(row.revenue);
    day.commission += decimalToNumber(row.commission);
    if (row.ordersCount > 0) day.partnerIds.add(row.resellerId);
    salesByDay.set(dayKey, day);
  }

  for (const row of usageRows) {
    if (!row.resellerId || !resellerIdSet.has(row.resellerId)) continue;

    summary.sessionsCount += row.sessionsCount;
    summary.uniqueCredentials += row.uniqueCredentials;
    summary.totalBytes += bigintToNumber(row.totalBytes);
    summary.totalSessionTimeSec += row.totalSessionTimeSec;

    const partner = usageMap.get(row.resellerId) ?? {
      sessionsCount: 0,
      uniqueCredentials: 0,
      totalBytes: 0,
    };
    partner.sessionsCount += row.sessionsCount;
    partner.uniqueCredentials += row.uniqueCredentials;
    partner.totalBytes += bigintToNumber(row.totalBytes);
    usageMap.set(row.resellerId, partner);

    const dayKey = utcDayKey(row.date);
    const day = usageByDay.get(dayKey) ?? {
      sessionsCount: 0,
      totalBytes: 0,
      partnerIds: new Set<string>(),
    };
    day.sessionsCount += row.sessionsCount;
    day.totalBytes += bigintToNumber(row.totalBytes);
    if (row.sessionsCount > 0) day.partnerIds.add(row.resellerId);
    usageByDay.set(dayKey, day);
  }

  summary.revenue = Math.round(summary.revenue * 100) / 100;
  summary.commission = Math.round(summary.commission * 100) / 100;
  summary.netRevenue = Math.round(summary.netRevenue * 100) / 100;

  const byPartner = mergePartnerRows(resellers, salesMap, usageMap);
  summary.activePartnerCount = byPartner.filter(
    (p) => p.ordersCount > 0 || p.sessionsCount > 0
  ).length;

  return {
    summary,
    previousSummary: emptySummary(resellers.length),
    dailyTrend: mergeDailyTrend(salesByDay, usageByDay, periodFrom, periodTo),
    byPartner,
    dataSource: 'aggregated',
  };
}

async function aggregateFromLiveOrders(
  prisma: PrismaClient,
  orgId: string,
  resellerIds: string[],
  resellers: ResellerMeta[],
  periodFrom: Date,
  periodTo: Date
): Promise<PartnerAnalyticsPayload> {
  const resellerIdSet = new Set(resellerIds);

  const orders =
    resellerIds.length === 0
      ? []
      : await prisma.saleOrder.findMany({
          where: {
            orgId,
            status: 'PAID',
            soldAt: { gte: periodFrom, lte: periodTo },
            resellerId: { in: resellerIds },
          },
          select: {
            total: true,
            soldAt: true,
            resellerId: true,
            items: { select: { qty: true } },
          },
        });

  const salesMap = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >();
  const salesByDay = new Map<
    string,
    { ordersCount: number; revenue: number; commission: number; partnerIds: Set<string> }
  >();

  for (const order of orders) {
    if (!order.soldAt || !order.resellerId || !resellerIdSet.has(order.resellerId)) continue;
    const revenue = decimalToNumber(order.total);
    const itemsCount = order.items.reduce((s, i) => s + i.qty, 0);

    const partner = salesMap.get(order.resellerId) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    partner.ordersCount += 1;
    partner.itemsCount += itemsCount;
    partner.revenue += revenue;
    partner.netRevenue += revenue;
    salesMap.set(order.resellerId, partner);

    const dayKey = utcDayKey(order.soldAt);
    const day = salesByDay.get(dayKey) ?? {
      ordersCount: 0,
      revenue: 0,
      commission: 0,
      partnerIds: new Set<string>(),
    };
    day.ordersCount += 1;
    day.revenue += revenue;
    day.partnerIds.add(order.resellerId);
    salesByDay.set(dayKey, day);
  }

  const byPartner = mergePartnerRows(resellers, salesMap, new Map());
  const summary = emptySummary(resellers.length);
  summary.ordersCount = orders.length;
  summary.itemsCount = byPartner.reduce((s, r) => s + r.itemsCount, 0);
  summary.revenue = byPartner.reduce((s, r) => s + r.revenue, 0);
  summary.netRevenue = summary.revenue;
  summary.activePartnerCount = byPartner.filter((p) => p.ordersCount > 0).length;

  return {
    summary,
    previousSummary: emptySummary(resellers.length),
    dailyTrend: mergeDailyTrend(salesByDay, new Map(), periodFrom, periodTo),
    byPartner,
    dataSource: 'live',
  };
}

export async function buildPartnerAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: { resellerId?: string }
): Promise<PartnerAnalyticsPayload> {
  const resellers = await loadResellerMeta(prisma, orgId, filters?.resellerId);
  const resellerIds = resellers.map((r) => r.id);

  if (resellers.length === 0) {
    return {
      summary: emptySummary(0),
      previousSummary: emptySummary(0),
      dailyTrend: mergeDailyTrend(new Map(), new Map(), periodFrom, periodTo),
      byPartner: [],
      dataSource: 'aggregated',
    };
  }

  const aggregated = await aggregateFromDailyStats(
    prisma,
    orgId,
    resellerIds,
    resellers,
    periodFrom,
    periodTo
  );
  const current =
    aggregated ??
    (await aggregateFromLiveOrders(prisma, orgId, resellerIds, resellers, periodFrom, periodTo));

  const prev = previousPeriod(periodFrom, periodTo);
  const prevAggregated = await aggregateFromDailyStats(
    prisma,
    orgId,
    resellerIds,
    resellers,
    prev.from,
    prev.to
  );
  const previousSummary =
    prevAggregated?.summary ??
    (await aggregateFromLiveOrders(prisma, orgId, resellerIds, resellers, prev.from, prev.to))
      .summary;

  return {
    ...current,
    previousSummary,
  };
}
