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
  itemsCount: number;
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
  activePartners: number;
};

export type PartnerPlanColumn = {
  planId: string;
  code: string;
  name: string;
};

export type PartnerPlanBreakdown = {
  planId: string;
  code: string;
  name: string;
  tokensCount: number;
  revenue: number;
};

export type PartnerStation = {
  stationId: string;
  name: string;
  stationSizeId: string | null;
};

export type PartnerRow = {
  resellerId: string;
  code: string;
  name: string;
  status: string;
  stationCount: number;
  stations: PartnerStation[];
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  sessionsCount: number;
  uniqueCredentials: number;
  totalBytes: number;
  byPlan: PartnerPlanBreakdown[];
};

export type PartnerAnalyticsPayload = {
  summary: PartnerAnalyticsSummary;
  previousSummary: PartnerAnalyticsSummary;
  dailyTrend: PartnerDailyPoint[];
  byPartner: PartnerRow[];
  plans: PartnerPlanColumn[];
  planTotals: PartnerPlanBreakdown[];
  dataSource: 'aggregated' | 'live';
};

type ResellerMeta = {
  id: string;
  code: string;
  name: string;
  status: string;
  stationCount: number;
  stations: PartnerStation[];
};

type PlanMeta = PartnerPlanColumn;
type PlanSalesBucket = { tokensCount: number; revenue: number };
type PartnerAnalyticsSource = 'aggregated' | 'live';

function planBucketKey(resellerId: string, planId: string): string {
  return `${resellerId}|${planId}`;
}

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
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; partnerIds: Set<string> }
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
      itemsCount: 0,
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
      itemsCount: sales.itemsCount,
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
  const days =
    preset === 'today' || preset === '1d'
      ? 1
      : preset === '7d'
        ? 7
        : preset === '90d'
          ? 90
          : 30;
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
      resellerStations: {
        where: { deletedAt: null },
        select: {
          stationId: true,
          station: { select: { name: true, stationSizeId: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return resellers.map((r) => {
    const stations = r.resellerStations
      .map((link) => ({
        stationId: link.stationId,
        name: link.station.name,
        stationSizeId: link.station.stationSizeId ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      status: r.status,
      stationCount: stations.length,
      stations,
    };
  });
}

async function loadPlanMeta(prisma: PrismaClient, orgId: string): Promise<PlanMeta[]> {
  const plans = await prisma.plan.findMany({
    where: { orgId, deletedAt: null },
    select: { id: true, code: true, name: true },
    orderBy: [{ name: 'asc' }, { code: 'asc' }],
  });
  return plans.map((p) => ({ planId: p.id, code: p.code, name: p.name }));
}

function emptyPlanBreakdown(plans: PlanMeta[]): PartnerPlanBreakdown[] {
  return plans.map((plan) => ({
    planId: plan.planId,
    code: plan.code,
    name: plan.name,
    tokensCount: 0,
    revenue: 0,
  }));
}

function buildPlanTotals(byPartner: PartnerRow[], plans: PlanMeta[]): PartnerPlanBreakdown[] {
  return plans.map((plan) => {
    let tokensCount = 0;
    let revenue = 0;
    for (const partner of byPartner) {
      const match = partner.byPlan.find((p) => p.planId === plan.planId);
      if (!match) continue;
      tokensCount += match.tokensCount;
      revenue += match.revenue;
    }
    return {
      planId: plan.planId,
      code: plan.code,
      name: plan.name,
      tokensCount,
      revenue: Math.round(revenue * 100) / 100,
    };
  });
}

function emptyPayload(
  partnerCount: number,
  resellers: ResellerMeta[],
  plans: PlanMeta[],
  periodFrom: Date,
  periodTo: Date,
  dataSource: PartnerAnalyticsSource
): PartnerAnalyticsPayload {
  return {
    summary: emptySummary(partnerCount),
    previousSummary: emptySummary(partnerCount),
    dailyTrend: mergeDailyTrend(new Map(), new Map(), periodFrom, periodTo),
    byPartner: mergePartnerRows(resellers, new Map(), new Map(), new Map(), plans),
    plans,
    planTotals: emptyPlanBreakdown(plans),
    dataSource,
  };
}

function mergePartnerRows(
  resellers: ResellerMeta[],
  salesMap: Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >,
  usageMap: Map<string, { sessionsCount: number; uniqueCredentials: number; totalBytes: number }>,
  planSalesMap: Map<string, PlanSalesBucket>,
  plans: PlanMeta[]
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
      const byPlan = plans.map((plan) => {
        const bucket = planSalesMap.get(planBucketKey(reseller.id, plan.planId));
        return {
          planId: plan.planId,
          code: plan.code,
          name: plan.name,
          tokensCount: bucket?.tokensCount ?? 0,
          revenue: Math.round((bucket?.revenue ?? 0) * 100) / 100,
        };
      });
      return {
        resellerId: reseller.id,
        code: reseller.code,
        name: reseller.name,
        status: reseller.status,
        stationCount: reseller.stationCount,
        stations: reseller.stations,
        ordersCount: sales.ordersCount,
        itemsCount: sales.itemsCount,
        revenue: Math.round(sales.revenue * 100) / 100,
        commission: Math.round(sales.commission * 100) / 100,
        netRevenue: Math.round(sales.netRevenue * 100) / 100,
        sessionsCount: usage.sessionsCount,
        uniqueCredentials: usage.uniqueCredentials,
        totalBytes: usage.totalBytes,
        byPlan,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.commission - a.commission);
}

async function aggregateFromDailyStats(
  prisma: PrismaClient,
  orgId: string,
  resellerIds: string[],
  resellers: ResellerMeta[],
  plans: PlanMeta[],
  periodFrom: Date,
  periodTo: Date
): Promise<PartnerAnalyticsPayload> {
  if (resellerIds.length === 0) {
    return emptyPayload(0, resellers, plans, periodFrom, periodTo, 'aggregated');
  }

  const resellerIdSet = new Set(resellerIds);
  const baseWhere = {
    orgId,
    deletedAt: null,
    date: { gte: periodFrom, lte: periodTo },
    resellerId: { in: resellerIds },
  };

  const [salesRows, usageRows] = await Promise.all([
    prisma.dailySalesStat.findMany({
      where: baseWhere,
      select: {
        date: true,
        resellerId: true,
        planId: true,
        ordersCount: true,
        itemsCount: true,
        revenue: true,
        commission: true,
        netRevenue: true,
        plan: { select: { id: true, code: true, name: true } },
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

  const salesMap = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >();
  const usageMap = new Map<
    string,
    { sessionsCount: number; uniqueCredentials: number; totalBytes: number }
  >();
  const planSalesMap = new Map<string, PlanSalesBucket>();
  const planById = new Map<string, PlanMeta>();
  const salesByDay = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; partnerIds: Set<string> }
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

    if (row.planId) {
      const key = planBucketKey(row.resellerId, row.planId);
      const bucket = planSalesMap.get(key) ?? { tokensCount: 0, revenue: 0 };
      bucket.tokensCount += row.itemsCount;
      bucket.revenue += decimalToNumber(row.revenue);
      planSalesMap.set(key, bucket);
      if (!planById.has(row.planId) && row.plan) {
        planById.set(row.planId, {
          planId: row.plan.id,
          code: row.plan.code,
          name: row.plan.name,
        });
      }
    }

    const dayKey = utcDayKey(row.date);
    const day = salesByDay.get(dayKey) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      partnerIds: new Set<string>(),
    };
    day.ordersCount += row.ordersCount;
    day.itemsCount += row.itemsCount;
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

  const resolvedPlans = [
    ...plans,
    ...[...planById.values()].filter((p) => !plans.some((c) => c.planId === p.planId)),
  ];
  const byPartner = mergePartnerRows(resellers, salesMap, usageMap, planSalesMap, resolvedPlans);
  summary.activePartnerCount = byPartner.filter(
    (p) => p.ordersCount > 0 || p.sessionsCount > 0
  ).length;

  return {
    summary,
    previousSummary: emptySummary(resellers.length),
    dailyTrend: mergeDailyTrend(salesByDay, usageByDay, periodFrom, periodTo),
    byPartner,
    plans: resolvedPlans,
    planTotals: buildPlanTotals(byPartner, resolvedPlans),
    dataSource: 'aggregated',
  };
}

async function aggregateFromLiveOrders(
  prisma: PrismaClient,
  orgId: string,
  resellerIds: string[],
  resellers: ResellerMeta[],
  plans: PlanMeta[],
  periodFrom: Date,
  periodTo: Date
): Promise<PartnerAnalyticsPayload> {
  if (resellerIds.length === 0) {
    return emptyPayload(0, resellers, plans, periodFrom, periodTo, 'live');
  }

  type LiveItemRow = {
    orderId: string;
    resellerId: string;
    planId: string;
    qty: number;
    lineTotal: Prisma.Decimal | number;
    day: Date;
  };

  const itemRows = await prisma.$queryRaw<LiveItemRow[]>`
    SELECT
      so.id AS "orderId",
      so.reseller_id AS "resellerId",
      si.plan_id AS "planId",
      si.qty::int AS qty,
      si.line_total AS "lineTotal",
      (timezone('Asia/Yangon', so.sold_at))::date AS day
    FROM wf_sale_order so
    INNER JOIN wf_sale_item si ON si.order_id = so.id
    WHERE so.org_id = ${orgId}
      AND so.status = 'PAID'
      AND so.sold_at >= ${periodFrom}
      AND so.sold_at <= ${periodTo}
      AND so.reseller_id IN (${Prisma.join(resellerIds)})
  `;

  const resellerIdSet = new Set(resellerIds);
  const salesMap = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >();
  const planSalesMap = new Map<string, PlanSalesBucket>();
  const orderIdsByReseller = new Map<string, Set<string>>();
  const orderIdsByDay = new Map<string, Set<string>>();
  const soldPlanIds = new Set<string>();
  const salesByDay = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; partnerIds: Set<string> }
  >();

  for (const row of itemRows) {
    if (!row.resellerId || !resellerIdSet.has(row.resellerId)) continue;
    const revenue = decimalToNumber(row.lineTotal as Prisma.Decimal);

    const partner = salesMap.get(row.resellerId) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    const seen = orderIdsByReseller.get(row.resellerId) ?? new Set<string>();
    if (!seen.has(row.orderId)) {
      seen.add(row.orderId);
      orderIdsByReseller.set(row.resellerId, seen);
      partner.ordersCount += 1;
    }
    partner.itemsCount += row.qty;
    partner.revenue += revenue;
    partner.netRevenue = partner.revenue;
    salesMap.set(row.resellerId, partner);

    if (row.planId) {
      soldPlanIds.add(row.planId);
      const key = planBucketKey(row.resellerId, row.planId);
      const bucket = planSalesMap.get(key) ?? { tokensCount: 0, revenue: 0 };
      bucket.tokensCount += row.qty;
      bucket.revenue += revenue;
      planSalesMap.set(key, bucket);
    }

    const dayKey = utcDayKey(row.day);
    const day = salesByDay.get(dayKey) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      partnerIds: new Set<string>(),
    };
    const daySeen = orderIdsByDay.get(dayKey) ?? new Set<string>();
    if (!daySeen.has(row.orderId)) {
      daySeen.add(row.orderId);
      orderIdsByDay.set(dayKey, daySeen);
      day.ordersCount += 1;
    }
    day.itemsCount += row.qty;
    day.revenue += revenue;
    day.partnerIds.add(row.resellerId);
    salesByDay.set(dayKey, day);
  }

  let resolvedPlans = plans;
  const missingPlanIds = [...soldPlanIds].filter((id) => !plans.some((p) => p.planId === id));
  if (missingPlanIds.length > 0) {
    const extras = await prisma.plan.findMany({
      where: { orgId, id: { in: missingPlanIds } },
      select: { id: true, code: true, name: true },
    });
    resolvedPlans = [
      ...plans,
      ...extras.map((p) => ({ planId: p.id, code: p.code, name: p.name })),
    ];
  }

  const byPartner = mergePartnerRows(resellers, salesMap, new Map(), planSalesMap, resolvedPlans);
  const summary = emptySummary(resellers.length);
  summary.ordersCount = byPartner.reduce((s, r) => s + r.ordersCount, 0);
  summary.itemsCount = byPartner.reduce((s, r) => s + r.itemsCount, 0);
  summary.revenue = Math.round(byPartner.reduce((s, r) => s + r.revenue, 0) * 100) / 100;
  summary.netRevenue = summary.revenue;
  summary.activePartnerCount = byPartner.filter((p) => p.ordersCount > 0).length;

  return {
    summary,
    previousSummary: emptySummary(resellers.length),
    dailyTrend: mergeDailyTrend(salesByDay, new Map(), periodFrom, periodTo),
    byPartner,
    plans: resolvedPlans,
    planTotals: buildPlanTotals(byPartner, resolvedPlans),
    dataSource: 'live',
  };
}

export async function buildPartnerAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: { resellerId?: string },
  options?: { source?: PartnerAnalyticsSource }
): Promise<PartnerAnalyticsPayload> {
  const source: PartnerAnalyticsSource = options?.source ?? 'aggregated';
  const [resellers, plans] = await Promise.all([
    loadResellerMeta(prisma, orgId, filters?.resellerId),
    loadPlanMeta(prisma, orgId),
  ]);
  const resellerIds = resellers.map((r) => r.id);

  if (resellers.length === 0) {
    return emptyPayload(0, resellers, plans, periodFrom, periodTo, source);
  }

  const current =
    source === 'live'
      ? await aggregateFromLiveOrders(
          prisma,
          orgId,
          resellerIds,
          resellers,
          plans,
          periodFrom,
          periodTo
        )
      : await aggregateFromDailyStats(
          prisma,
          orgId,
          resellerIds,
          resellers,
          plans,
          periodFrom,
          periodTo
        );

  const prev = previousPeriod(periodFrom, periodTo);
  const previous =
    source === 'live'
      ? await aggregateFromLiveOrders(
          prisma,
          orgId,
          resellerIds,
          resellers,
          plans,
          prev.from,
          prev.to
        )
      : await aggregateFromDailyStats(
          prisma,
          orgId,
          resellerIds,
          resellers,
          plans,
          prev.from,
          prev.to
        );

  return {
    ...current,
    previousSummary: previous.summary,
  };
}
