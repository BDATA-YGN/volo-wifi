import { Prisma, PrismaClient } from '@/generated/prisma/client';

export type PlanAnalyticsSummary = {
  planCount: number;
  activePlanCount: number;
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

export type PlanDailyPoint = {
  date: string;
  ordersCount: number;
  revenue: number;
  commission: number;
  itemsCount: number;
  sessionsCount: number;
  totalBytes: number;
  activePlans: number;
};

export type PlanRow = {
  planId: string;
  code: string;
  name: string;
  quotaType: string;
  isActive: boolean;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  uniqueCredentials: number;
  totalBytes: number;
};

export type PlanQuotaTypeRow = {
  quotaType: string;
  planCount: number;
  activePlanCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
};

export type PlanAnalyticsPayload = {
  summary: PlanAnalyticsSummary;
  previousSummary: PlanAnalyticsSummary;
  dailyTrend: PlanDailyPoint[];
  byPlan: PlanRow[];
  byQuotaType: PlanQuotaTypeRow[];
  dataSource: 'aggregated' | 'live';
};

type PlanMeta = {
  id: string;
  code: string;
  name: string;
  quotaType: string;
  isActive: boolean;
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

function emptySummary(planCount = 0): PlanAnalyticsSummary {
  return {
    planCount,
    activePlanCount: 0,
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
    {
      ordersCount: number;
      revenue: number;
      commission: number;
      itemsCount: number;
      planIds: Set<string>;
    }
  >,
  usageByDay: Map<string, { sessionsCount: number; totalBytes: number; planIds: Set<string> }>,
  periodFrom: Date,
  periodTo: Date
): PlanDailyPoint[] {
  const points: PlanDailyPoint[] = [];
  const cursor = new Date(periodFrom);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(periodTo);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = utcDayKey(cursor);
    const sales = salesByDay.get(key) ?? {
      ordersCount: 0,
      revenue: 0,
      commission: 0,
      itemsCount: 0,
      planIds: new Set<string>(),
    };
    const usage = usageByDay.get(key) ?? {
      sessionsCount: 0,
      totalBytes: 0,
      planIds: new Set<string>(),
    };
    const activePlans = new Set([...sales.planIds, ...usage.planIds]);
    points.push({
      date: key,
      ordersCount: sales.ordersCount,
      revenue: sales.revenue,
      commission: sales.commission,
      itemsCount: sales.itemsCount,
      sessionsCount: usage.sessionsCount,
      totalBytes: usage.totalBytes,
      activePlans: activePlans.size,
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

async function loadPlanMeta(
  prisma: PrismaClient,
  orgId: string,
  filters?: { planId?: string; quotaType?: string }
): Promise<PlanMeta[]> {
  const plans = await prisma.plan.findMany({
    where: {
      orgId,
      deletedAt: null,
      ...(filters?.planId ? { id: filters.planId } : {}),
      ...(filters?.quotaType
        ? { quotaType: filters.quotaType as 'TIME_ONLY' | 'DATA_ONLY' | 'TIME_AND_DATA' }
        : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      quotaType: true,
      isActive: true,
    },
    orderBy: { name: 'asc' },
  });

  return plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    quotaType: p.quotaType,
    isActive: p.isActive,
  }));
}

function mergePlanRows(
  plans: PlanMeta[],
  salesMap: Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >,
  usageMap: Map<string, { sessionsCount: number; uniqueCredentials: number; totalBytes: number }>
): PlanRow[] {
  return plans
    .map((plan) => {
      const sales = salesMap.get(plan.id) ?? {
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
      };
      const usage = usageMap.get(plan.id) ?? {
        sessionsCount: 0,
        uniqueCredentials: 0,
        totalBytes: 0,
      };
      return {
        planId: plan.id,
        code: plan.code,
        name: plan.name,
        quotaType: plan.quotaType,
        isActive: plan.isActive,
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
    .sort((a, b) => b.revenue - a.revenue || b.itemsCount - a.itemsCount);
}

function buildByQuotaType(byPlan: PlanRow[]): PlanQuotaTypeRow[] {
  const typeMap = new Map<string, PlanQuotaTypeRow>();

  for (const plan of byPlan) {
    const row =
      typeMap.get(plan.quotaType) ??
      ({
        quotaType: plan.quotaType,
        planCount: 0,
        activePlanCount: 0,
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        sessionsCount: 0,
        totalBytes: 0,
      } as PlanQuotaTypeRow);

    row.planCount += 1;
    if (plan.ordersCount > 0 || plan.sessionsCount > 0) row.activePlanCount += 1;
    row.ordersCount += plan.ordersCount;
    row.itemsCount += plan.itemsCount;
    row.revenue += plan.revenue;
    row.commission += plan.commission;
    row.sessionsCount += plan.sessionsCount;
    row.totalBytes += plan.totalBytes;
    typeMap.set(plan.quotaType, row);
  }

  return [...typeMap.values()]
    .map((r) => ({
      ...r,
      revenue: Math.round(r.revenue * 100) / 100,
      commission: Math.round(r.commission * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

async function aggregateFromDailyStats(
  prisma: PrismaClient,
  orgId: string,
  planIds: string[],
  plans: PlanMeta[],
  periodFrom: Date,
  periodTo: Date
): Promise<PlanAnalyticsPayload | null> {
  const planIdSet = new Set(planIds);
  const baseWhere =
    planIds.length > 0
      ? {
          orgId,
          deletedAt: null,
          date: { gte: periodFrom, lte: periodTo },
          planId: { in: planIds },
        }
      : {
          orgId,
          deletedAt: null,
          date: { gte: periodFrom, lte: periodTo },
          planId: { in: [] as string[] },
        };

  const [salesRows, usageRows] = await Promise.all([
    prisma.dailySalesStat.findMany({
      where: baseWhere,
      select: {
        date: true,
        planId: true,
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
        planId: true,
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
    {
      ordersCount: number;
      revenue: number;
      commission: number;
      itemsCount: number;
      planIds: Set<string>;
    }
  >();
  const usageByDay = new Map<
    string,
    { sessionsCount: number; totalBytes: number; planIds: Set<string> }
  >();

  const summary = emptySummary(plans.length);

  for (const row of salesRows) {
    if (!row.planId || !planIdSet.has(row.planId)) continue;

    summary.ordersCount += row.ordersCount;
    summary.itemsCount += row.itemsCount;
    summary.revenue += decimalToNumber(row.revenue);
    summary.commission += decimalToNumber(row.commission);
    summary.netRevenue += decimalToNumber(row.netRevenue);

    const plan = salesMap.get(row.planId) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    plan.ordersCount += row.ordersCount;
    plan.itemsCount += row.itemsCount;
    plan.revenue += decimalToNumber(row.revenue);
    plan.commission += decimalToNumber(row.commission);
    plan.netRevenue += decimalToNumber(row.netRevenue);
    salesMap.set(row.planId, plan);

    const dayKey = utcDayKey(row.date);
    const day = salesByDay.get(dayKey) ?? {
      ordersCount: 0,
      revenue: 0,
      commission: 0,
      itemsCount: 0,
      planIds: new Set<string>(),
    };
    day.ordersCount += row.ordersCount;
    day.revenue += decimalToNumber(row.revenue);
    day.commission += decimalToNumber(row.commission);
    day.itemsCount += row.itemsCount;
    if (row.ordersCount > 0) day.planIds.add(row.planId);
    salesByDay.set(dayKey, day);
  }

  for (const row of usageRows) {
    if (!row.planId || !planIdSet.has(row.planId)) continue;

    summary.sessionsCount += row.sessionsCount;
    summary.uniqueCredentials += row.uniqueCredentials;
    summary.totalBytes += bigintToNumber(row.totalBytes);
    summary.totalSessionTimeSec += row.totalSessionTimeSec;

    const plan = usageMap.get(row.planId) ?? {
      sessionsCount: 0,
      uniqueCredentials: 0,
      totalBytes: 0,
    };
    plan.sessionsCount += row.sessionsCount;
    plan.uniqueCredentials += row.uniqueCredentials;
    plan.totalBytes += bigintToNumber(row.totalBytes);
    usageMap.set(row.planId, plan);

    const dayKey = utcDayKey(row.date);
    const day = usageByDay.get(dayKey) ?? {
      sessionsCount: 0,
      totalBytes: 0,
      planIds: new Set<string>(),
    };
    day.sessionsCount += row.sessionsCount;
    day.totalBytes += bigintToNumber(row.totalBytes);
    if (row.sessionsCount > 0) day.planIds.add(row.planId);
    usageByDay.set(dayKey, day);
  }

  summary.revenue = Math.round(summary.revenue * 100) / 100;
  summary.commission = Math.round(summary.commission * 100) / 100;
  summary.netRevenue = Math.round(summary.netRevenue * 100) / 100;

  const byPlan = mergePlanRows(plans, salesMap, usageMap);
  summary.activePlanCount = byPlan.filter((p) => p.ordersCount > 0 || p.sessionsCount > 0).length;

  return {
    summary,
    previousSummary: emptySummary(plans.length),
    dailyTrend: mergeDailyTrend(salesByDay, usageByDay, periodFrom, periodTo),
    byPlan,
    byQuotaType: buildByQuotaType(byPlan),
    dataSource: 'aggregated',
  };
}

async function aggregateFromLiveOrders(
  prisma: PrismaClient,
  orgId: string,
  planIds: string[],
  plans: PlanMeta[],
  periodFrom: Date,
  periodTo: Date
): Promise<PlanAnalyticsPayload> {
  const planIdSet = new Set(planIds);

  const orders =
    planIds.length === 0
      ? []
      : await prisma.saleOrder.findMany({
          where: {
            orgId,
            status: 'PAID',
            soldAt: { gte: periodFrom, lte: periodTo },
            items: { some: { planId: { in: planIds } } },
          },
          select: {
            id: true,
            soldAt: true,
            items: {
              where: { planId: { in: planIds } },
              select: { planId: true, qty: true, lineTotal: true },
            },
          },
        });

  const salesMap = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >();
  const salesByDay = new Map<
    string,
    {
      ordersCount: number;
      revenue: number;
      commission: number;
      itemsCount: number;
      planIds: Set<string>;
    }
  >();
  const planOrderCounts = new Map<string, Set<string>>();

  for (const order of orders) {
    if (!order.soldAt) continue;

    for (const item of order.items) {
      if (!item.planId || !planIdSet.has(item.planId)) continue;
      const revenue = decimalToNumber(item.lineTotal);

      const plan = salesMap.get(item.planId) ?? {
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        commission: 0,
        netRevenue: 0,
      };
      plan.itemsCount += item.qty;
      plan.revenue += revenue;
      plan.netRevenue += revenue;
      salesMap.set(item.planId, plan);

      const orderSet = planOrderCounts.get(item.planId) ?? new Set<string>();
      orderSet.add(order.id);
      planOrderCounts.set(item.planId, orderSet);
    }

    const dayKey = utcDayKey(order.soldAt);
    const day = salesByDay.get(dayKey) ?? {
      ordersCount: 0,
      revenue: 0,
      commission: 0,
      itemsCount: 0,
      planIds: new Set<string>(),
    };
    day.ordersCount += 1;
    for (const item of order.items) {
      if (!item.planId) continue;
      day.revenue += decimalToNumber(item.lineTotal);
      day.itemsCount += item.qty;
      day.planIds.add(item.planId);
    }
    salesByDay.set(dayKey, day);
  }

  for (const [planId, orderSet] of planOrderCounts) {
    const plan = salesMap.get(planId);
    if (plan) plan.ordersCount = orderSet.size;
  }

  const byPlan = mergePlanRows(plans, salesMap, new Map());
  const summary = emptySummary(plans.length);
  summary.ordersCount = orders.length;
  summary.itemsCount = byPlan.reduce((s, r) => s + r.itemsCount, 0);
  summary.revenue = byPlan.reduce((s, r) => s + r.revenue, 0);
  summary.netRevenue = summary.revenue;
  summary.activePlanCount = byPlan.filter((p) => p.ordersCount > 0).length;

  return {
    summary,
    previousSummary: emptySummary(plans.length),
    dailyTrend: mergeDailyTrend(salesByDay, new Map(), periodFrom, periodTo),
    byPlan,
    byQuotaType: buildByQuotaType(byPlan),
    dataSource: 'live',
  };
}

export async function buildPlanAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: { planId?: string; quotaType?: string }
): Promise<PlanAnalyticsPayload> {
  const plans = await loadPlanMeta(prisma, orgId, filters);
  const planIds = plans.map((p) => p.id);

  if (plans.length === 0) {
    return {
      summary: emptySummary(0),
      previousSummary: emptySummary(0),
      dailyTrend: mergeDailyTrend(new Map(), new Map(), periodFrom, periodTo),
      byPlan: [],
      byQuotaType: [],
      dataSource: 'aggregated',
    };
  }

  const aggregated = await aggregateFromDailyStats(
    prisma,
    orgId,
    planIds,
    plans,
    periodFrom,
    periodTo
  );
  const current =
    aggregated ??
    (await aggregateFromLiveOrders(prisma, orgId, planIds, plans, periodFrom, periodTo));

  const prev = previousPeriod(periodFrom, periodTo);
  const prevAggregated = await aggregateFromDailyStats(
    prisma,
    orgId,
    planIds,
    plans,
    prev.from,
    prev.to
  );
  const previousSummary =
    prevAggregated?.summary ??
    (await aggregateFromLiveOrders(prisma, orgId, planIds, plans, prev.from, prev.to)).summary;

  return {
    ...current,
    previousSummary,
  };
}
