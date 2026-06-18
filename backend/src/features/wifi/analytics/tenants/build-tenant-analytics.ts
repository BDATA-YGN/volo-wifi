import { Prisma, PrismaClient } from '@/generated/prisma/client';

export type TenantAnalyticsSummary = {
  tenantCount: number;
  activeTenantCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  totalBytes: number;
};

export type TenantDailyPoint = {
  date: string;
  ordersCount: number;
  revenue: number;
  commission: number;
  activeTenants: number;
  sessionsCount: number;
};

export type TenantRow = {
  orgId: string;
  code: string;
  name: string;
  isActive: boolean;
  currency: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  partnerCount: number;
  stationCount: number;
};

export type TenantAnalyticsPayload = {
  summary: TenantAnalyticsSummary;
  previousSummary: TenantAnalyticsSummary;
  dailyTrend: TenantDailyPoint[];
  byTenant: TenantRow[];
  dataSource: 'aggregated' | 'live';
};

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
}

function bigintToNumber(value: bigint | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : 0;
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function emptySummary(tenantCount = 0): TenantAnalyticsSummary {
  return {
    tenantCount,
    activeTenantCount: 0,
    ordersCount: 0,
    itemsCount: 0,
    revenue: 0,
    commission: 0,
    netRevenue: 0,
    sessionsCount: 0,
    totalBytes: 0,
  };
}

function mergeDailyTrend(
  salesByDay: Map<string, { ordersCount: number; revenue: number; commission: number; orgIds: Set<string> }>,
  usageByDay: Map<string, { sessionsCount: number }>,
  periodFrom: Date,
  periodTo: Date
): TenantDailyPoint[] {
  const points: TenantDailyPoint[] = [];
  const cursor = new Date(periodFrom);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(periodTo);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = utcDayKey(cursor);
    const sales = salesByDay.get(key) ?? { ordersCount: 0, revenue: 0, commission: 0, orgIds: new Set() };
    const usage = usageByDay.get(key) ?? { sessionsCount: 0 };
    points.push({
      date: key,
      ordersCount: sales.ordersCount,
      revenue: sales.revenue,
      commission: sales.commission,
      activeTenants: sales.orgIds.size,
      sessionsCount: usage.sessionsCount,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return points;
}

export function resolvePeriodFromPreset(
  preset: string,
  periodTo: Date = new Date()
): { periodFrom: Date; periodTo: Date } {
  const end = new Date(periodTo);
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  return { periodFrom: start, periodTo: end };
}

export function previousPeriod(periodFrom: Date, periodTo: Date): { from: Date; to: Date } {
  const ms = periodTo.getTime() - periodFrom.getTime();
  const to = new Date(periodFrom.getTime() - 1);
  const from = new Date(to.getTime() - ms);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

async function loadOrgMeta(
  prisma: PrismaClient,
  orgIds: string[]
): Promise<Map<string, { code: string; name: string; isActive: boolean; currency: string; partnerCount: number; stationCount: number }>> {
  if (orgIds.length === 0) return new Map();

  const orgs = await prisma.org.findMany({
    where: { id: { in: orgIds }, deletedAt: null },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      currency: true,
      _count: {
        select: {
          resellers: { where: { deletedAt: null } },
          stations: { where: { deletedAt: null } },
        },
      },
    },
  });

  return new Map(
    orgs.map((o) => [
      o.id,
      {
        code: o.code,
        name: o.name,
        isActive: o.isActive,
        currency: o.currency,
        partnerCount: o._count.resellers,
        stationCount: o._count.stations,
      },
    ])
  );
}

async function aggregateFromDailyStats(
  prisma: PrismaClient,
  orgIds: string[],
  periodFrom: Date,
  periodTo: Date
): Promise<TenantAnalyticsPayload | null> {
  if (orgIds.length === 0) {
    return {
      summary: emptySummary(0),
      previousSummary: emptySummary(0),
      dailyTrend: mergeDailyTrend(new Map(), new Map(), periodFrom, periodTo),
      byTenant: [],
      dataSource: 'aggregated',
    };
  }

  const [salesRows, usageRows, orgMeta] = await Promise.all([
    prisma.dailySalesStat.findMany({
      where: {
        orgId: { in: orgIds },
        deletedAt: null,
        date: { gte: periodFrom, lte: periodTo },
      },
      select: {
        orgId: true,
        date: true,
        ordersCount: true,
        itemsCount: true,
        revenue: true,
        commission: true,
        netRevenue: true,
      },
    }),
    prisma.dailyRadiusUsageStat.findMany({
      where: {
        orgId: { in: orgIds },
        deletedAt: null,
        date: { gte: periodFrom, lte: periodTo },
      },
      select: {
        orgId: true,
        date: true,
        sessionsCount: true,
        totalBytes: true,
      },
    }),
    loadOrgMeta(prisma, orgIds),
  ]);

  if (salesRows.length === 0 && usageRows.length === 0) {
    return null;
  }

  const tenantMap = new Map<
    string,
    {
      ordersCount: number;
      itemsCount: number;
      revenue: number;
      commission: number;
      netRevenue: number;
      sessionsCount: number;
    }
  >();
  const salesByDay = new Map<
    string,
    { ordersCount: number; revenue: number; commission: number; orgIds: Set<string> }
  >();
  const usageByDay = new Map<string, { sessionsCount: number }>();

  const summary = emptySummary(orgIds.length);
  let totalBytes = 0;

  for (const row of salesRows) {
    summary.ordersCount += row.ordersCount;
    summary.itemsCount += row.itemsCount;
    summary.revenue += decimalToNumber(row.revenue);
    summary.commission += decimalToNumber(row.commission);
    summary.netRevenue += decimalToNumber(row.netRevenue);

    const t =
      tenantMap.get(row.orgId) ??
      ({
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
        sessionsCount: 0,
      } as const);
    const agg = { ...t };
    agg.ordersCount += row.ordersCount;
    agg.itemsCount += row.itemsCount;
    agg.revenue += decimalToNumber(row.revenue);
    agg.commission += decimalToNumber(row.commission);
    agg.netRevenue += decimalToNumber(row.netRevenue);
    tenantMap.set(row.orgId, agg);

    const dayKey = utcDayKey(row.date);
    const day = salesByDay.get(dayKey) ?? {
      ordersCount: 0,
      revenue: 0,
      commission: 0,
      orgIds: new Set<string>(),
    };
    day.ordersCount += row.ordersCount;
    day.revenue += decimalToNumber(row.revenue);
    day.commission += decimalToNumber(row.commission);
    if (row.ordersCount > 0) day.orgIds.add(row.orgId);
    salesByDay.set(dayKey, day);
  }

  for (const row of usageRows) {
    summary.sessionsCount += row.sessionsCount;
    totalBytes += bigintToNumber(row.totalBytes);

    const t = tenantMap.get(row.orgId);
    if (t) {
      t.sessionsCount += row.sessionsCount;
    } else {
      tenantMap.set(row.orgId, {
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
        sessionsCount: row.sessionsCount,
      });
    }

    const dayKey = utcDayKey(row.date);
    const day = usageByDay.get(dayKey) ?? { sessionsCount: 0 };
    day.sessionsCount += row.sessionsCount;
    usageByDay.set(dayKey, day);
  }

  summary.revenue = Math.round(summary.revenue * 100) / 100;
  summary.commission = Math.round(summary.commission * 100) / 100;
  summary.netRevenue = Math.round(summary.netRevenue * 100) / 100;
  summary.totalBytes = totalBytes;
  summary.activeTenantCount = [...tenantMap.values()].filter((t) => t.ordersCount > 0).length;

  const byTenant: TenantRow[] = orgIds
    .map((orgId) => {
      const meta = orgMeta.get(orgId);
      const stats = tenantMap.get(orgId) ?? {
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
        sessionsCount: 0,
      };
      return {
        orgId,
        code: meta?.code ?? '—',
        name: meta?.name ?? 'Unknown',
        isActive: meta?.isActive ?? false,
        currency: meta?.currency ?? 'MMK',
        ordersCount: stats.ordersCount,
        itemsCount: stats.itemsCount,
        revenue: Math.round(stats.revenue * 100) / 100,
        commission: Math.round(stats.commission * 100) / 100,
        netRevenue: Math.round(stats.netRevenue * 100) / 100,
        sessionsCount: stats.sessionsCount,
        partnerCount: meta?.partnerCount ?? 0,
        stationCount: meta?.stationCount ?? 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    summary,
    previousSummary: emptySummary(orgIds.length),
    dailyTrend: mergeDailyTrend(salesByDay, usageByDay, periodFrom, periodTo),
    byTenant,
    dataSource: 'aggregated',
  };
}

async function aggregateFromLiveOrders(
  prisma: PrismaClient,
  orgIds: string[],
  periodFrom: Date,
  periodTo: Date
): Promise<TenantAnalyticsPayload> {
  const [orders, orgMeta] = await Promise.all([
    orgIds.length === 0
      ? Promise.resolve([])
      : prisma.saleOrder.findMany({
          where: {
            orgId: { in: orgIds },
            status: 'PAID',
            soldAt: { gte: periodFrom, lte: periodTo },
          },
          select: {
            orgId: true,
            total: true,
            soldAt: true,
            items: { select: { qty: true } },
          },
        }),
    loadOrgMeta(prisma, orgIds),
  ]);

  const tenantMap = new Map<string, { ordersCount: number; itemsCount: number; revenue: number }>();
  const salesByDay = new Map<
    string,
    { ordersCount: number; revenue: number; commission: number; orgIds: Set<string> }
  >();

  for (const order of orders) {
    if (!order.soldAt) continue;
    const revenue = decimalToNumber(order.total);
    const itemsCount = order.items.reduce((s, i) => s + i.qty, 0);

    const t = tenantMap.get(order.orgId) ?? { ordersCount: 0, itemsCount: 0, revenue: 0 };
    t.ordersCount += 1;
    t.itemsCount += itemsCount;
    t.revenue += revenue;
    tenantMap.set(order.orgId, t);

    const dayKey = utcDayKey(order.soldAt);
    const day = salesByDay.get(dayKey) ?? {
      ordersCount: 0,
      revenue: 0,
      commission: 0,
      orgIds: new Set<string>(),
    };
    day.ordersCount += 1;
    day.revenue += revenue;
    day.orgIds.add(order.orgId);
    salesByDay.set(dayKey, day);
  }

  const byTenant: TenantRow[] = orgIds
    .map((orgId) => {
      const meta = orgMeta.get(orgId);
      const stats = tenantMap.get(orgId) ?? { ordersCount: 0, itemsCount: 0, revenue: 0 };
      const revenue = Math.round(stats.revenue * 100) / 100;
      return {
        orgId,
        code: meta?.code ?? '—',
        name: meta?.name ?? 'Unknown',
        isActive: meta?.isActive ?? false,
        currency: meta?.currency ?? 'MMK',
        ordersCount: stats.ordersCount,
        itemsCount: stats.itemsCount,
        revenue,
        commission: 0,
        netRevenue: revenue,
        sessionsCount: 0,
        partnerCount: meta?.partnerCount ?? 0,
        stationCount: meta?.stationCount ?? 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const summary = emptySummary(orgIds.length);
  summary.ordersCount = orders.length;
  summary.itemsCount = byTenant.reduce((s, t) => s + t.itemsCount, 0);
  summary.revenue = byTenant.reduce((s, t) => s + t.revenue, 0);
  summary.netRevenue = summary.revenue;
  summary.activeTenantCount = byTenant.filter((t) => t.ordersCount > 0).length;

  return {
    summary,
    previousSummary: emptySummary(orgIds.length),
    dailyTrend: mergeDailyTrend(salesByDay, new Map(), periodFrom, periodTo),
    byTenant,
    dataSource: 'live',
  };
}

export async function buildTenantAnalytics(
  prisma: PrismaClient,
  orgIds: string[],
  periodFrom: Date,
  periodTo: Date
): Promise<TenantAnalyticsPayload> {
  const aggregated = await aggregateFromDailyStats(prisma, orgIds, periodFrom, periodTo);
  const current =
    aggregated ?? (await aggregateFromLiveOrders(prisma, orgIds, periodFrom, periodTo));

  const prev = previousPeriod(periodFrom, periodTo);
  const prevAggregated = await aggregateFromDailyStats(prisma, orgIds, prev.from, prev.to);
  const previousSummary =
    prevAggregated?.summary ??
    (await aggregateFromLiveOrders(prisma, orgIds, prev.from, prev.to)).summary;

  return {
    ...current,
    previousSummary,
  };
}
