import { Prisma, PrismaClient } from '@/generated/prisma/client';

export type InsightsSummary = {
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

export type InsightsDailyPoint = {
  date: string;
  ordersCount: number;
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
};

export type InsightsPlanRow = {
  planId: string | null;
  planCode: string;
  planName: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
};

export type InsightsStationRow = {
  stationId: string | null;
  stationCode: string;
  stationName: string;
  ordersCount: number;
  revenue: number;
  sessionsCount: number;
  totalBytes: number;
};

export type PartnerInsightsPayload = {
  summary: InsightsSummary;
  previousSummary: InsightsSummary;
  dailyTrend: InsightsDailyPoint[];
  byPlan: InsightsPlanRow[];
  byStation: InsightsStationRow[];
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

function emptySummary(): InsightsSummary {
  return {
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

function mergeDailyMaps(
  salesByDay: Map<string, { ordersCount: number; revenue: number; commission: number }>,
  usageByDay: Map<string, { sessionsCount: number; totalBytes: number }>,
  periodFrom: Date,
  periodTo: Date
): InsightsDailyPoint[] {
  const points: InsightsDailyPoint[] = [];
  const cursor = new Date(periodFrom);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(periodTo);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = utcDayKey(cursor);
    const sales = salesByDay.get(key) ?? { ordersCount: 0, revenue: 0, commission: 0 };
    const usage = usageByDay.get(key) ?? { sessionsCount: 0, totalBytes: 0 };
    points.push({
      date: key,
      ordersCount: sales.ordersCount,
      revenue: sales.revenue,
      commission: sales.commission,
      sessionsCount: usage.sessionsCount,
      totalBytes: usage.totalBytes,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return points;
}

async function aggregateFromDailyStats(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string,
  periodFrom: Date,
  periodTo: Date
): Promise<PartnerInsightsPayload | null> {
  const [salesRows, usageRows] = await Promise.all([
    prisma.dailySalesStat.findMany({
      where: {
        orgId,
        resellerId,
        deletedAt: null,
        date: { gte: periodFrom, lte: periodTo },
      },
      select: {
        date: true,
        stationId: true,
        planId: true,
        ordersCount: true,
        itemsCount: true,
        revenue: true,
        commission: true,
        netRevenue: true,
        plan: { select: { code: true, name: true } },
        station: { select: { code: true, name: true } },
      },
    }),
    prisma.dailyRadiusUsageStat.findMany({
      where: {
        orgId,
        resellerId,
        deletedAt: null,
        date: { gte: periodFrom, lte: periodTo },
      },
      select: {
        date: true,
        stationId: true,
        planId: true,
        sessionsCount: true,
        uniqueCredentials: true,
        totalBytes: true,
        totalSessionTimeSec: true,
        station: { select: { code: true, name: true } },
      },
    }),
  ]);

  if (salesRows.length === 0 && usageRows.length === 0) {
    return null;
  }

  const summary = emptySummary();
  const salesByDay = new Map<string, { ordersCount: number; revenue: number; commission: number }>();
  const usageByDay = new Map<string, { sessionsCount: number; totalBytes: number }>();
  const planMap = new Map<string, InsightsPlanRow>();
  const stationSalesMap = new Map<string, InsightsStationRow>();
  const stationUsageMap = new Map<string, { sessionsCount: number; totalBytes: number }>();

  for (const row of salesRows) {
    summary.ordersCount += row.ordersCount;
    summary.itemsCount += row.itemsCount;
    summary.revenue += decimalToNumber(row.revenue);
    summary.commission += decimalToNumber(row.commission);
    summary.netRevenue += decimalToNumber(row.netRevenue);

    const dayKey = utcDayKey(row.date);
    const day = salesByDay.get(dayKey) ?? { ordersCount: 0, revenue: 0, commission: 0 };
    day.ordersCount += row.ordersCount;
    day.revenue += decimalToNumber(row.revenue);
    day.commission += decimalToNumber(row.commission);
    salesByDay.set(dayKey, day);

    const planKey = row.planId ?? '__none__';
    const planRow = planMap.get(planKey) ?? {
      planId: row.planId,
      planCode: row.plan?.code ?? '—',
      planName: row.plan?.name ?? 'Unknown plan',
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
    };
    planRow.ordersCount += row.ordersCount;
    planRow.itemsCount += row.itemsCount;
    planRow.revenue += decimalToNumber(row.revenue);
    planRow.commission += decimalToNumber(row.commission);
    planMap.set(planKey, planRow);

    const stationKey = row.stationId ?? '__none__';
    const stationRow = stationSalesMap.get(stationKey) ?? {
      stationId: row.stationId,
      stationCode: row.station?.code ?? '—',
      stationName: row.station?.name ?? 'Unassigned',
      ordersCount: 0,
      revenue: 0,
      sessionsCount: 0,
      totalBytes: 0,
    };
    stationRow.ordersCount += row.ordersCount;
    stationRow.revenue += decimalToNumber(row.revenue);
    stationSalesMap.set(stationKey, stationRow);
  }

  for (const row of usageRows) {
    summary.sessionsCount += row.sessionsCount;
    summary.uniqueCredentials += row.uniqueCredentials;
    summary.totalBytes += bigintToNumber(row.totalBytes);
    summary.totalSessionTimeSec += row.totalSessionTimeSec;

    const dayKey = utcDayKey(row.date);
    const day = usageByDay.get(dayKey) ?? { sessionsCount: 0, totalBytes: 0 };
    day.sessionsCount += row.sessionsCount;
    day.totalBytes += bigintToNumber(row.totalBytes);
    usageByDay.set(dayKey, day);

    const stationKey = row.stationId ?? '__none__';
    const usage = stationUsageMap.get(stationKey) ?? { sessionsCount: 0, totalBytes: 0 };
    usage.sessionsCount += row.sessionsCount;
    usage.totalBytes += bigintToNumber(row.totalBytes);
    stationUsageMap.set(stationKey, usage);
  }

  const byStation: InsightsStationRow[] = [];
  const stationKeys = new Set([...stationSalesMap.keys(), ...stationUsageMap.keys()]);
  for (const key of stationKeys) {
    const sales = stationSalesMap.get(key);
    const usage = stationUsageMap.get(key);
    byStation.push({
      stationId: sales?.stationId ?? null,
      stationCode: sales?.stationCode ?? '—',
      stationName: sales?.stationName ?? 'Unassigned',
      ordersCount: sales?.ordersCount ?? 0,
      revenue: sales?.revenue ?? 0,
      sessionsCount: usage?.sessionsCount ?? 0,
      totalBytes: usage?.totalBytes ?? 0,
    });
  }

  summary.revenue = Math.round(summary.revenue * 100) / 100;
  summary.commission = Math.round(summary.commission * 100) / 100;
  summary.netRevenue = Math.round(summary.netRevenue * 100) / 100;

  return {
    summary,
    previousSummary: emptySummary(),
    dailyTrend: mergeDailyMaps(salesByDay, usageByDay, periodFrom, periodTo),
    byPlan: [...planMap.values()].sort((a, b) => b.revenue - a.revenue),
    byStation: byStation.sort((a, b) => b.revenue - a.revenue),
    dataSource: 'aggregated',
  };
}

async function aggregateFromLiveOrders(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string,
  periodFrom: Date,
  periodTo: Date
): Promise<PartnerInsightsPayload> {
  const orders = await prisma.saleOrder.findMany({
    where: {
      orgId,
      resellerId,
      status: 'PAID',
      soldAt: { gte: periodFrom, lte: periodTo },
    },
    select: {
      id: true,
      total: true,
      soldAt: true,
      stationId: true,
      station: { select: { code: true, name: true } },
      items: {
        select: {
          qty: true,
          lineTotal: true,
          planId: true,
          plan: { select: { code: true, name: true } },
        },
      },
    },
  });

  const summary = emptySummary();
  const salesByDay = new Map<string, { ordersCount: number; revenue: number; commission: number }>();
  const planMap = new Map<string, InsightsPlanRow>();
  const stationMap = new Map<string, InsightsStationRow>();

  for (const order of orders) {
    if (!order.soldAt) continue;
    const revenue = decimalToNumber(order.total);
    summary.ordersCount += 1;
    summary.revenue += revenue;

    const dayKey = utcDayKey(order.soldAt);
    const day = salesByDay.get(dayKey) ?? { ordersCount: 0, revenue: 0, commission: 0 };
    day.ordersCount += 1;
    day.revenue += revenue;
    salesByDay.set(dayKey, day);

    const stationKey = order.stationId ?? '__none__';
    const stationRow = stationMap.get(stationKey) ?? {
      stationId: order.stationId,
      stationCode: order.station?.code ?? '—',
      stationName: order.station?.name ?? 'Unassigned',
      ordersCount: 0,
      revenue: 0,
      sessionsCount: 0,
      totalBytes: 0,
    };
    stationRow.ordersCount += 1;
    stationRow.revenue += revenue;
    stationMap.set(stationKey, stationRow);

    for (const item of order.items) {
      summary.itemsCount += item.qty;
      const lineRevenue = decimalToNumber(item.lineTotal);
      const planKey = item.planId;
      const planRow = planMap.get(planKey) ?? {
        planId: item.planId,
        planCode: item.plan.code,
        planName: item.plan.name,
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
      };
      planRow.itemsCount += item.qty;
      planRow.revenue += lineRevenue;
      planMap.set(planKey, planRow);
    }
  }

  for (const plan of planMap.values()) {
    plan.ordersCount = orders.filter((o) =>
      o.items.some((i) => i.planId === plan.planId)
    ).length;
  }

  summary.revenue = Math.round(summary.revenue * 100) / 100;
  summary.netRevenue = summary.revenue;

  return {
    summary,
    previousSummary: emptySummary(),
    dailyTrend: mergeDailyMaps(salesByDay, new Map(), periodFrom, periodTo),
    byPlan: [...planMap.values()].sort((a, b) => b.revenue - a.revenue),
    byStation: [...stationMap.values()].sort((a, b) => b.revenue - a.revenue),
    dataSource: 'live',
  };
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

export async function buildPartnerInsights(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string,
  periodFrom: Date,
  periodTo: Date
): Promise<PartnerInsightsPayload> {
  const aggregated = await aggregateFromDailyStats(
    prisma,
    orgId,
    resellerId,
    periodFrom,
    periodTo
  );

  const current =
    aggregated ??
    (await aggregateFromLiveOrders(prisma, orgId, resellerId, periodFrom, periodTo));

  const prev = previousPeriod(periodFrom, periodTo);
  const prevAggregated = await aggregateFromDailyStats(
    prisma,
    orgId,
    resellerId,
    prev.from,
    prev.to
  );
  const previousSummary =
    prevAggregated?.summary ??
    (await aggregateFromLiveOrders(prisma, orgId, resellerId, prev.from, prev.to)).summary;

  return {
    ...current,
    previousSummary,
  };
}
