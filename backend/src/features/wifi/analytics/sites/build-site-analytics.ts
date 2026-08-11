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

export type SiteAnalyticsView = 'stats' | 'sites' | 'tiers';

export type SitePlanColumn = {
  planId: string;
  code: string;
  name: string;
};

export type SitePlanBreakdown = {
  planId: string;
  code: string;
  name: string;
  tokensCount: number;
  revenue: number;
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
  byPlan: SitePlanBreakdown[];
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
  plans: SitePlanColumn[];
  /** Grand totals per plan (for paginated sites table footer). */
  planTotals: SitePlanBreakdown[];
  dataSource: 'aggregated' | 'live';
  pagination: {
    page: number;
    limit: number;
    total: number;
  } | null;
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

type PlanMeta = SitePlanColumn;

type PlanSalesBucket = { tokensCount: number; revenue: number };

type AggregateViewOptions = {
  view: SiteAnalyticsView;
  page: number;
  limit: number;
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

async function loadPlanMeta(prisma: PrismaClient, orgId: string): Promise<PlanMeta[]> {
  const plans = await prisma.plan.findMany({
    where: { orgId, deletedAt: null },
    select: { id: true, code: true, name: true },
    orderBy: [{ name: 'asc' }, { code: 'asc' }],
  });
  return plans.map((p) => ({ planId: p.id, code: p.code, name: p.name }));
}

function emptyPayload(
  siteCount: number,
  stations: StationMeta[],
  plans: PlanMeta[],
  periodFrom: Date,
  periodTo: Date,
  dataSource: 'aggregated' | 'live',
  view: SiteAnalyticsView = 'stats'
): SiteAnalyticsPayload {
  const bySite =
    view === 'sites' ? mergeSiteRows(stations, new Map(), new Map(), new Map(), plans) : [];
  const byTier =
    view === 'tiers'
      ? buildByTier(mergeSiteRows(stations, new Map(), new Map(), new Map(), []))
      : [];
  return {
    summary: emptySummary(siteCount),
    previousSummary: emptySummary(siteCount),
    dailyTrend:
      view === 'stats' ? mergeDailyTrend(new Map(), new Map(), periodFrom, periodTo) : [],
    bySite,
    byTier,
    plans: view === 'sites' ? plans : [],
    planTotals:
      view === 'sites'
        ? plans.map((p) => ({
            planId: p.planId,
            code: p.code,
            name: p.name,
            tokensCount: 0,
            revenue: 0,
          }))
        : [],
    dataSource,
    pagination:
      view === 'sites'
        ? { page: 1, limit: 10, total: bySite.length }
        : null,
  };
}

function buildPlanTotals(bySite: SiteRow[], plans: PlanMeta[]): SitePlanBreakdown[] {
  return plans.map((plan) => {
    let tokensCount = 0;
    let revenue = 0;
    for (const site of bySite) {
      const match = site.byPlan.find((p) => p.planId === plan.planId);
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

function paginateSites(
  bySite: SiteRow[],
  plans: PlanMeta[],
  page: number,
  limit: number
): Pick<SiteAnalyticsPayload, 'bySite' | 'planTotals' | 'pagination' | 'plans'> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const total = bySite.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit) || 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  return {
    plans,
    bySite: bySite.slice(start, start + safeLimit),
    planTotals: buildPlanTotals(bySite, plans),
    pagination: { page: safePage, limit: safeLimit, total },
  };
}

function shapeForView(
  input: {
    summary: SiteAnalyticsSummary;
    previousSummary: SiteAnalyticsSummary;
    dailyTrend: SiteDailyPoint[];
    bySiteFull: SiteRow[];
    plans: PlanMeta[];
    dataSource: 'aggregated' | 'live';
  },
  opts: AggregateViewOptions
): SiteAnalyticsPayload {
  if (opts.view === 'stats') {
    return {
      summary: input.summary,
      previousSummary: input.previousSummary,
      dailyTrend: input.dailyTrend,
      bySite: [],
      byTier: [],
      plans: [],
      planTotals: [],
      dataSource: input.dataSource,
      pagination: null,
    };
  }

  if (opts.view === 'tiers') {
    return {
      summary: input.summary,
      previousSummary: emptySummary(input.summary.siteCount),
      dailyTrend: [],
      bySite: [],
      byTier: buildByTier(input.bySiteFull),
      plans: [],
      planTotals: [],
      dataSource: input.dataSource,
      pagination: null,
    };
  }

  return {
    summary: input.summary,
    previousSummary: emptySummary(input.summary.siteCount),
    dailyTrend: [],
    byTier: [],
    dataSource: input.dataSource,
    ...paginateSites(input.bySiteFull, input.plans, opts.page, opts.limit),
  };
}

function planBucketKey(stationId: string, planId: string): string {
  return `${stationId}|${planId}`;
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
  >,
  planSalesMap: Map<string, PlanSalesBucket>,
  plans: PlanMeta[]
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
      const byPlan = plans.map((plan) => {
        const bucket = planSalesMap.get(planBucketKey(station.id, plan.planId));
        return {
          planId: plan.planId,
          code: plan.code,
          name: plan.name,
          tokensCount: bucket?.tokensCount ?? 0,
          revenue: Math.round((bucket?.revenue ?? 0) * 100) / 100,
        };
      });
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
        byPlan,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.sessionsCount - a.sessionsCount);
}

async function aggregateFromDailyStats(
  prisma: PrismaClient,
  orgId: string,
  stationIds: string[],
  stations: StationMeta[],
  plans: PlanMeta[],
  periodFrom: Date,
  periodTo: Date
): Promise<SiteAnalyticsPayload | null> {
  if (stationIds.length === 0) {
    return emptyPayload(0, stations, plans, periodFrom, periodTo, 'aggregated');
  }

  const stationIdSet = new Set(stationIds);
  const planById = new Map(plans.map((p) => [p.planId, p]));
  const salesWhere = {
    orgId,
    deletedAt: null,
    date: { gte: periodFrom, lte: periodTo },
    stationId: { in: stationIds },
  };

  const [salesRows, usageRows] = await Promise.all([
    prisma.dailySalesStat.findMany({
      where: salesWhere,
      select: {
        date: true,
        stationId: true,
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
  const planSalesMap = new Map<string, PlanSalesBucket>();
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

    if (row.planId) {
      const key = planBucketKey(row.stationId, row.planId);
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

  // Prefer catalog order; append any sold plans that were soft-deleted from catalog.
  const resolvedPlans = [
    ...plans,
    ...[...planById.values()].filter((p) => !plans.some((c) => c.planId === p.planId)),
  ];

  const bySite = mergeSiteRows(stations, salesMap, usageMap, planSalesMap, resolvedPlans);
  summary.activeSiteCount = bySite.filter((s) => s.ordersCount > 0 || s.sessionsCount > 0).length;

  return {
    summary,
    previousSummary: emptySummary(stations.length),
    dailyTrend: mergeDailyTrend(salesByDay, usageByDay, periodFrom, periodTo),
    bySite,
    byTier: buildByTier(bySite),
    plans: resolvedPlans,
    planTotals: buildPlanTotals(bySite, resolvedPlans),
    dataSource: 'aggregated',
    pagination: { page: 1, limit: bySite.length || 10, total: bySite.length },
  };
}

/**
 * Lightweight previous-period summary from daily stats only.
 * Never falls back to scanning live sale orders (can be 100k+ rows).
 */
async function summaryFromDailyStats(
  prisma: PrismaClient,
  orgId: string,
  stationIds: string[],
  siteCount: number,
  periodFrom: Date,
  periodTo: Date
): Promise<SiteAnalyticsSummary> {
  if (stationIds.length === 0) return emptySummary(0);

  const where = {
    orgId,
    deletedAt: null as null,
    date: { gte: periodFrom, lte: periodTo },
    stationId: { in: stationIds },
  };

  const [salesAgg, usageAgg, activeSalesStations, activeUsageStations] = await Promise.all([
    prisma.dailySalesStat.aggregate({
      where,
      _sum: {
        ordersCount: true,
        itemsCount: true,
        revenue: true,
        commission: true,
        netRevenue: true,
      },
    }),
    prisma.dailyRadiusUsageStat.aggregate({
      where,
      _sum: {
        sessionsCount: true,
        uniqueCredentials: true,
        totalBytes: true,
        totalSessionTimeSec: true,
      },
    }),
    prisma.dailySalesStat.findMany({
      where: { ...where, ordersCount: { gt: 0 } },
      select: { stationId: true },
      distinct: ['stationId'],
    }),
    prisma.dailyRadiusUsageStat.findMany({
      where: { ...where, sessionsCount: { gt: 0 } },
      select: { stationId: true },
      distinct: ['stationId'],
    }),
  ]);

  const activeIds = new Set<string>();
  for (const r of activeSalesStations) if (r.stationId) activeIds.add(r.stationId);
  for (const r of activeUsageStations) if (r.stationId) activeIds.add(r.stationId);

  return {
    siteCount,
    activeSiteCount: activeIds.size,
    ordersCount: salesAgg._sum.ordersCount ?? 0,
    itemsCount: salesAgg._sum.itemsCount ?? 0,
    revenue: Math.round(decimalToNumber(salesAgg._sum.revenue) * 100) / 100,
    commission: Math.round(decimalToNumber(salesAgg._sum.commission) * 100) / 100,
    netRevenue: Math.round(decimalToNumber(salesAgg._sum.netRevenue) * 100) / 100,
    sessionsCount: usageAgg._sum.sessionsCount ?? 0,
    uniqueCredentials: usageAgg._sum.uniqueCredentials ?? 0,
    totalBytes: bigintToNumber(usageAgg._sum.totalBytes),
    totalSessionTimeSec: usageAgg._sum.totalSessionTimeSec ?? 0,
  };
}

/**
 * Live fallback using SQL aggregates — never loads every sale_order row into memory.
 */
async function aggregateFromLiveOrders(
  prisma: PrismaClient,
  orgId: string,
  stationIds: string[],
  stations: StationMeta[],
  plans: PlanMeta[],
  periodFrom: Date,
  periodTo: Date
): Promise<SiteAnalyticsPayload> {
  if (stationIds.length === 0) {
    return emptyPayload(0, stations, plans, periodFrom, periodTo, 'live');
  }

  type LiveSiteRow = {
    stationId: string;
    ordersCount: number;
    itemsCount: number;
    revenue: Prisma.Decimal | number;
  };
  type LivePlanRow = {
    stationId: string;
    planId: string;
    tokensCount: number;
    revenue: Prisma.Decimal | number;
  };
  type LiveDayRow = {
    day: Date;
    stationId: string;
    ordersCount: number;
    revenue: Prisma.Decimal | number;
  };

  const [siteRows, planRows, dayRows] = await Promise.all([
    prisma.$queryRaw<LiveSiteRow[]>`
      SELECT
        so.station_id AS "stationId",
        COUNT(*)::int AS "ordersCount",
        COALESCE(SUM(item_totals.items_qty), 0)::int AS "itemsCount",
        COALESCE(SUM(so.total), 0) AS revenue
      FROM wf_sale_order so
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(si.qty), 0)::int AS items_qty
        FROM wf_sale_item si
        WHERE si.order_id = so.id
      ) item_totals ON true
      WHERE so.org_id = ${orgId}
        AND so.status = 'PAID'
        AND so.sold_at >= ${periodFrom}
        AND so.sold_at <= ${periodTo}
        AND so.station_id IN (${Prisma.join(stationIds)})
      GROUP BY so.station_id
    `,
    prisma.$queryRaw<LivePlanRow[]>`
      SELECT
        so.station_id AS "stationId",
        si.plan_id AS "planId",
        COALESCE(SUM(si.qty), 0)::int AS "tokensCount",
        COALESCE(SUM(si.line_total), 0) AS revenue
      FROM wf_sale_order so
      INNER JOIN wf_sale_item si ON si.order_id = so.id
      WHERE so.org_id = ${orgId}
        AND so.status = 'PAID'
        AND so.sold_at >= ${periodFrom}
        AND so.sold_at <= ${periodTo}
        AND so.station_id IN (${Prisma.join(stationIds)})
      GROUP BY so.station_id, si.plan_id
    `,
    prisma.$queryRaw<LiveDayRow[]>`
      SELECT
        (timezone('Asia/Yangon', so.sold_at))::date AS day,
        so.station_id AS "stationId",
        COUNT(*)::int AS "ordersCount",
        COALESCE(SUM(so.total), 0) AS revenue
      FROM wf_sale_order so
      WHERE so.org_id = ${orgId}
        AND so.status = 'PAID'
        AND so.sold_at >= ${periodFrom}
        AND so.sold_at <= ${periodTo}
        AND so.station_id IN (${Prisma.join(stationIds)})
      GROUP BY 1, so.station_id
    `,
  ]);

  const salesMap = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >();
  for (const row of siteRows) {
    const revenue = decimalToNumber(row.revenue as Prisma.Decimal);
    salesMap.set(row.stationId, {
      ordersCount: row.ordersCount,
      itemsCount: row.itemsCount,
      revenue,
      commission: 0,
      netRevenue: revenue,
    });
  }

  const planSalesMap = new Map<string, PlanSalesBucket>();
  const soldPlanIds = new Set<string>();
  for (const row of planRows) {
    if (!row.planId) continue;
    soldPlanIds.add(row.planId);
    const key = planBucketKey(row.stationId, row.planId);
    const bucket = planSalesMap.get(key) ?? { tokensCount: 0, revenue: 0 };
    bucket.tokensCount += row.tokensCount;
    bucket.revenue += decimalToNumber(row.revenue as Prisma.Decimal);
    planSalesMap.set(key, bucket);
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

  const salesByDay = new Map<
    string,
    { ordersCount: number; revenue: number; commission: number; siteIds: Set<string> }
  >();
  for (const row of dayRows) {
    const dayKey = utcDayKey(row.day);
    const day = salesByDay.get(dayKey) ?? {
      ordersCount: 0,
      revenue: 0,
      commission: 0,
      siteIds: new Set<string>(),
    };
    day.ordersCount += row.ordersCount;
    day.revenue += decimalToNumber(row.revenue as Prisma.Decimal);
    day.siteIds.add(row.stationId);
    salesByDay.set(dayKey, day);
  }

  const bySite = mergeSiteRows(stations, salesMap, new Map(), planSalesMap, resolvedPlans);
  const summary = emptySummary(stations.length);
  summary.ordersCount = bySite.reduce((s, r) => s + r.ordersCount, 0);
  summary.itemsCount = bySite.reduce((s, r) => s + r.itemsCount, 0);
  summary.revenue = Math.round(bySite.reduce((s, r) => s + r.revenue, 0) * 100) / 100;
  summary.netRevenue = summary.revenue;
  summary.activeSiteCount = bySite.filter((s) => s.ordersCount > 0).length;

  return {
    summary,
    previousSummary: emptySummary(stations.length),
    dailyTrend: mergeDailyTrend(salesByDay, new Map(), periodFrom, periodTo),
    bySite,
    byTier: buildByTier(bySite),
    plans: resolvedPlans,
    planTotals: buildPlanTotals(bySite, resolvedPlans),
    dataSource: 'live',
    pagination: { page: 1, limit: bySite.length || 10, total: bySite.length },
  };
}

export async function buildSiteAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: { stationId?: string; stationSizeId?: string },
  options?: { view?: SiteAnalyticsView; page?: number; limit?: number }
): Promise<SiteAnalyticsPayload> {
  const view = options?.view ?? 'stats';
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const opts: AggregateViewOptions = { view, page, limit };

  const [stations, plans] = await Promise.all([
    loadStationMeta(prisma, orgId, filters?.stationSizeId, filters?.stationId),
    view === 'sites' ? loadPlanMeta(prisma, orgId) : Promise.resolve([] as PlanMeta[]),
  ]);
  const stationIds = stations.map((s) => s.id);

  if (stations.length === 0) {
    return emptyPayload(0, stations, plans, periodFrom, periodTo, 'aggregated', view);
  }

  const prev = previousPeriod(periodFrom, periodTo);

  const [aggregated, previousSummary] = await Promise.all([
    aggregateFromDailyStats(prisma, orgId, stationIds, stations, plans, periodFrom, periodTo),
    view === 'stats'
      ? summaryFromDailyStats(
          prisma,
          orgId,
          stationIds,
          stations.length,
          prev.from,
          prev.to
        )
      : Promise.resolve(emptySummary(stations.length)),
  ]);

  const current =
    aggregated ??
    (await aggregateFromLiveOrders(
      prisma,
      orgId,
      stationIds,
      stations,
      plans,
      periodFrom,
      periodTo
    ));

  return shapeForView(
    {
      summary: current.summary,
      previousSummary,
      dailyTrend: current.dailyTrend,
      bySiteFull: current.bySite,
      plans: current.plans.length > 0 ? current.plans : plans,
      dataSource: current.dataSource,
    },
    opts
  );
}
