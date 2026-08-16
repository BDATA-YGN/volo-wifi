import { Prisma, PrismaClient } from '@/generated/prisma/client';
import { commissionForLine } from '@/jobs/reporting/lib/commission';
import {
  appDayKey as utcDayKey,
  appHourKey,
  eachAppDay,
  eachAppHour,
  isSameAppDay,
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
  itemsCount: number;
  revenue: number;
  commission: number;
  sessionsCount: number;
  totalBytes: number;
  activeSites: number;
};

export type SiteAnalyticsView = 'stats' | 'sites' | 'tiers';

export type SiteTrendGrain = 'day' | 'hour';

export type SiteAnalyticsSource = 'aggregated' | 'live';

export type SiteStatsCoverage = {
  daysInPeriod: number;
  daysWithSalesStats: number;
  daysWithUsageStats: number;
  lastAggregatedAt: string | null;
};

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
  byPlan: SitePlanBreakdown[];
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
  dataSource: SiteAnalyticsSource;
  trendGrain: SiteTrendGrain;
  statsCoverage: SiteStatsCoverage | null;
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

function coverageForPeriod(
  periodFrom: Date,
  periodTo: Date,
  salesDayCount: number,
  usageDayCount: number,
  lastAggregatedAt: Date | null
): SiteStatsCoverage {
  return {
    daysInPeriod: eachAppDay(periodFrom, periodTo).length,
    daysWithSalesStats: salesDayCount,
    daysWithUsageStats: usageDayCount,
    lastAggregatedAt: lastAggregatedAt ? lastAggregatedAt.toISOString() : null,
  };
}

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
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; siteIds: Set<string> }
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
      itemsCount: 0,
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
      itemsCount: sales.itemsCount,
      revenue: sales.revenue,
      commission: sales.commission,
      sessionsCount: usage.sessionsCount,
      totalBytes: usage.totalBytes,
      activeSites: activeSites.size,
    });
  }

  return points;
}

function mergeHourlyTrend(
  salesByHour: Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; siteIds: Set<string> }
  >,
  usageByHour: Map<string, { sessionsCount: number; totalBytes: number; siteIds: Set<string> }>,
  periodFrom: Date,
  periodTo: Date
): SiteDailyPoint[] {
  const points: SiteDailyPoint[] = [];
  for (const cursor of eachAppHour(periodFrom, periodTo)) {
    const key = appHourKey(cursor);
    const sales = salesByHour.get(key) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      siteIds: new Set<string>(),
    };
    const usage = usageByHour.get(key) ?? {
      sessionsCount: 0,
      totalBytes: 0,
      siteIds: new Set<string>(),
    };
    const activeSites = new Set([...sales.siteIds, ...usage.siteIds]);
    points.push({
      date: key,
      ordersCount: sales.ordersCount,
      itemsCount: sales.itemsCount,
      revenue: Math.round(sales.revenue * 100) / 100,
      commission: Math.round(sales.commission * 100) / 100,
      sessionsCount: usage.sessionsCount,
      totalBytes: usage.totalBytes,
      activeSites: activeSites.size,
    });
  }

  return points;
}

function hourBucketKey(dayKey: string, hour: number): string {
  return `${dayKey}T${String(hour).padStart(2, '0')}:00:00`;
}

async function buildHourlyTrendFromLive(
  prisma: PrismaClient,
  orgId: string,
  stationIds: string[],
  periodFrom: Date,
  periodTo: Date
): Promise<SiteDailyPoint[]> {
  if (stationIds.length === 0) {
    return mergeHourlyTrend(new Map(), new Map(), periodFrom, periodTo);
  }

  type HourlyItemRow = {
    orderId: string;
    stationId: string;
    resellerId: string | null;
    planId: string;
    qty: number;
    lineTotal: Prisma.Decimal | number;
    hour: number | string;
  };
  type HourlyRadiusRow = {
    hour: number | string;
    stationId: string;
    sessionsCount: number;
    totalBytes: bigint | number;
  };

  const parseHour = (value: number | string): number | null => {
    const hour = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
    return hour;
  };

  const [itemRows, radiusRows, rules] = await Promise.all([
    prisma.$queryRaw<HourlyItemRow[]>`
      SELECT
        so.id AS "orderId",
        so.station_id AS "stationId",
        so.reseller_id AS "resellerId",
        si.plan_id AS "planId",
        si.qty::int AS qty,
        si.line_total AS "lineTotal",
        EXTRACT(HOUR FROM timezone('Asia/Yangon', so.sold_at))::int AS hour
      FROM wf_sale_order so
      INNER JOIN wf_sale_item si ON si.order_id = so.id
      WHERE so.org_id = ${orgId}
        AND so.status = 'PAID'
        AND so.sold_at >= ${periodFrom}
        AND so.sold_at <= ${periodTo}
        AND so.station_id IN (${Prisma.join(stationIds)})
    `,
    prisma.$queryRaw<HourlyRadiusRow[]>`
      SELECT
        EXTRACT(HOUR FROM timezone('Asia/Yangon', rs.started_at))::int AS hour,
        COALESCE(rs.station_id, c.station_id) AS "stationId",
        COUNT(*)::int AS "sessionsCount",
        COALESCE(SUM(COALESCE(rs."totalBytes", 0)), 0) AS "totalBytes"
      FROM wf_radius_session rs
      LEFT JOIN wf_credential c ON c.id = rs.credential_id
      WHERE (rs.org_id = ${orgId} OR c.org_id = ${orgId})
        AND rs.started_at >= ${periodFrom}
        AND rs.started_at <= ${periodTo}
        AND COALESCE(rs.station_id, c.station_id) IN (${Prisma.join(stationIds)})
      GROUP BY 1, 2
    `,
    prisma.commissionRule.findMany({
      where: { orgId, deletedAt: null, isActive: true },
      select: {
        resellerId: true,
        planId: true,
        type: true,
        value: true,
        isActive: true,
      },
    }),
  ]);

  const dayKey = utcDayKey(periodFrom);
  const salesByHour = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; siteIds: Set<string> }
  >();
  const orderIdsByHour = new Map<string, Set<string>>();

  for (const row of itemRows) {
    const hour = parseHour(row.hour);
    if (!row.stationId || hour == null) continue;
    const key = hourBucketKey(dayKey, hour);
    const lineTotal = row.lineTotal as Prisma.Decimal;
    const revenue = decimalToNumber(lineTotal);
    const commission = commissionForLine(
      rules,
      row.resellerId,
      row.planId,
      lineTotal,
      row.qty
    );
    const bucket = salesByHour.get(key) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      siteIds: new Set<string>(),
    };
    const seen = orderIdsByHour.get(key) ?? new Set<string>();
    if (!seen.has(row.orderId)) {
      seen.add(row.orderId);
      orderIdsByHour.set(key, seen);
      bucket.ordersCount += 1;
    }
    bucket.itemsCount += row.qty;
    bucket.revenue += revenue;
    bucket.commission += commission;
    bucket.siteIds.add(row.stationId);
    salesByHour.set(key, bucket);
  }

  const usageByHour = new Map<
    string,
    { sessionsCount: number; totalBytes: number; siteIds: Set<string> }
  >();
  for (const row of radiusRows) {
    const hour = parseHour(row.hour);
    if (!row.stationId || hour == null) continue;
    const key = hourBucketKey(dayKey, hour);
    const bucket = usageByHour.get(key) ?? {
      sessionsCount: 0,
      totalBytes: 0,
      siteIds: new Set<string>(),
    };
    bucket.sessionsCount += row.sessionsCount;
    bucket.totalBytes += bigintToNumber(
      typeof row.totalBytes === 'bigint' ? row.totalBytes : BigInt(row.totalBytes)
    );
    if (row.sessionsCount > 0) bucket.siteIds.add(row.stationId);
    usageByHour.set(key, bucket);
  }

  return mergeHourlyTrend(salesByHour, usageByHour, periodFrom, periodTo);
}

function resolveTrend(
  periodFrom: Date,
  periodTo: Date,
  view: SiteAnalyticsView
): { grain: SiteTrendGrain; useHourly: boolean } {
  const grain: SiteTrendGrain = isSameAppDay(periodFrom, periodTo) ? 'hour' : 'day';
  return { grain, useHourly: view === 'stats' && grain === 'hour' };
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
  stationId?: string,
  allowedStationIds?: string[] | null
): Promise<StationMeta[]> {
  const idFilter = stationId
    ? allowedStationIds && !allowedStationIds.includes(stationId)
      ? { in: [] as string[] }
      : stationId
    : allowedStationIds
      ? { in: allowedStationIds }
      : undefined;
  const stations = await prisma.wifiStation.findMany({
    where: {
      orgId,
      deletedAt: null,
      ...(stationSizeId ? { stationSizeId } : {}),
      ...(idFilter ? { id: idFilter } : {}),
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
    dataSource: SiteAnalyticsSource,
  view: SiteAnalyticsView = 'stats'
): SiteAnalyticsPayload {
  const bySite =
    view === 'sites' ? mergeSiteRows(stations, new Map(), new Map(), new Map(), plans) : [];
  const byTier =
    view === 'tiers'
      ? buildByTier(mergeSiteRows(stations, new Map(), new Map(), new Map(), plans), plans)
      : [];
  const { grain, useHourly } = resolveTrend(periodFrom, periodTo, view);
  return {
    summary: emptySummary(siteCount),
    previousSummary: emptySummary(siteCount),
    dailyTrend: useHourly
      ? mergeHourlyTrend(new Map(), new Map(), periodFrom, periodTo)
      : view === 'stats'
        ? mergeDailyTrend(new Map(), new Map(), periodFrom, periodTo)
        : [],
    bySite,
    byTier,
    plans: view === 'sites' || view === 'tiers' ? plans : [],
    planTotals:
      view === 'sites' || view === 'tiers'
        ? plans.map((p) => ({
            planId: p.planId,
            code: p.code,
            name: p.name,
            tokensCount: 0,
            revenue: 0,
          }))
        : [],
    dataSource,
    trendGrain: grain,
    statsCoverage:
      dataSource === 'aggregated'
        ? coverageForPeriod(periodFrom, periodTo, 0, 0, null)
        : null,
    pagination:
      view === 'sites'
        ? { page: 1, limit: bySite.length, total: bySite.length }
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

function sitesListPayload(
  bySite: SiteRow[],
  plans: PlanMeta[]
): Pick<SiteAnalyticsPayload, 'bySite' | 'planTotals' | 'pagination' | 'plans'> {
  return {
    plans,
    bySite,
    planTotals: buildPlanTotals(bySite, plans),
    pagination: { page: 1, limit: bySite.length, total: bySite.length },
  };
}

function shapeForView(
  input: {
    summary: SiteAnalyticsSummary;
    previousSummary: SiteAnalyticsSummary;
    dailyTrend: SiteDailyPoint[];
    bySiteFull: SiteRow[];
    plans: PlanMeta[];
    dataSource: SiteAnalyticsSource;
    trendGrain: SiteTrendGrain;
    statsCoverage: SiteStatsCoverage | null;
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
      trendGrain: input.trendGrain,
      statsCoverage: input.statsCoverage,
      pagination: null,
    };
  }

  if (opts.view === 'tiers') {
    return {
      summary: input.summary,
      previousSummary: emptySummary(input.summary.siteCount),
      dailyTrend: [],
      bySite: [],
      byTier: buildByTier(input.bySiteFull, input.plans),
      plans: input.plans,
      planTotals: buildPlanTotals(input.bySiteFull, input.plans),
      dataSource: input.dataSource,
      trendGrain: input.trendGrain,
      statsCoverage: input.statsCoverage,
      pagination: null,
    };
  }

  return {
    summary: input.summary,
    previousSummary: emptySummary(input.summary.siteCount),
    dailyTrend: [],
    byTier: [],
    dataSource: input.dataSource,
    trendGrain: input.trendGrain,
    statsCoverage: input.statsCoverage,
    ...sitesListPayload(input.bySiteFull, input.plans),
  };
}

function planBucketKey(stationId: string, planId: string): string {
  return `${stationId}|${planId}`;
}

function emptyPlanBreakdown(plans: PlanMeta[]): SitePlanBreakdown[] {
  return plans.map((plan) => ({
    planId: plan.planId,
    code: plan.code,
    name: plan.name,
    tokensCount: 0,
    revenue: 0,
  }));
}

function buildByTier(bySite: SiteRow[], plans: PlanMeta[] = []): SiteTierRow[] {
  const catalog = plans.length
    ? plans
    : [
        ...new Map(
          bySite.flatMap((site) => site.byPlan ?? []).map((plan) => [plan.planId, plan])
        ).values(),
      ].map((plan) => ({ planId: plan.planId, code: plan.code, name: plan.name }));

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
        byPlan: emptyPlanBreakdown(catalog),
      } as SiteTierRow);

    tier.siteCount += 1;
    if (site.ordersCount > 0 || site.sessionsCount > 0) tier.activeSiteCount += 1;
    tier.ordersCount += site.ordersCount;
    tier.itemsCount += site.itemsCount;
    tier.revenue += site.revenue;
    tier.commission += site.commission;
    tier.sessionsCount += site.sessionsCount;
    tier.totalBytes += site.totalBytes;
    for (const plan of site.byPlan ?? []) {
      const bucket = tier.byPlan.find((p) => p.planId === plan.planId);
      if (bucket) {
        bucket.tokensCount += plan.tokensCount;
        bucket.revenue += plan.revenue;
      } else {
        tier.byPlan.push({ ...plan });
      }
    }
    tierMap.set(site.stationSizeId, tier);
  }

  return [...tierMap.values()]
    .map((t) => ({
      ...t,
      revenue: Math.round(t.revenue * 100) / 100,
      commission: Math.round(t.commission * 100) / 100,
      byPlan: t.byPlan.map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
      })),
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
): Promise<SiteAnalyticsPayload> {
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
        updatedAt: true,
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
        updatedAt: true,
      },
    }),
  ]);

  if (salesRows.length === 0 && usageRows.length === 0) {
    return emptyPayload(stations.length, stations, plans, periodFrom, periodTo, 'aggregated');
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
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; siteIds: Set<string> }
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
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      siteIds: new Set<string>(),
    };
    day.ordersCount += row.ordersCount;
    day.itemsCount += row.itemsCount;
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

  let lastAggregatedAt: Date | null = null;
  for (const row of salesRows) {
    if (!lastAggregatedAt || row.updatedAt > lastAggregatedAt) lastAggregatedAt = row.updatedAt;
  }
  for (const row of usageRows) {
    if (!lastAggregatedAt || row.updatedAt > lastAggregatedAt) lastAggregatedAt = row.updatedAt;
  }

  return {
    summary,
    previousSummary: emptySummary(stations.length),
    dailyTrend: mergeDailyTrend(salesByDay, usageByDay, periodFrom, periodTo),
    bySite,
    byTier: buildByTier(bySite, resolvedPlans),
    plans: resolvedPlans,
    planTotals: buildPlanTotals(bySite, resolvedPlans),
    dataSource: 'aggregated',
    trendGrain: 'day',
    statsCoverage: coverageForPeriod(
      periodFrom,
      periodTo,
      salesByDay.size,
      usageByDay.size,
      lastAggregatedAt
    ),
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
 * Today / running-table path — paid orders + RADIUS sessions, not daily stats.
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

  type LiveItemRow = {
    orderId: string;
    stationId: string;
    resellerId: string | null;
    planId: string;
    qty: number;
    lineTotal: Prisma.Decimal | number;
    day: Date;
  };
  type LiveRadiusSiteRow = {
    stationId: string;
    sessionsCount: number;
    uniqueCredentials: number;
    totalBytes: bigint | number;
    totalSessionTimeSec: number;
  };
  type LiveRadiusDayRow = {
    day: Date;
    stationId: string;
    sessionsCount: number;
    totalBytes: bigint | number;
  };

  const [itemRows, radiusSiteRows, radiusDayRows, uniqueCredRows, rules] = await Promise.all([
    prisma.$queryRaw<LiveItemRow[]>`
      SELECT
        so.id AS "orderId",
        so.station_id AS "stationId",
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
        AND so.station_id IN (${Prisma.join(stationIds)})
    `,
    prisma.$queryRaw<LiveRadiusSiteRow[]>`
      SELECT
        COALESCE(rs.station_id, c.station_id) AS "stationId",
        COUNT(*)::int AS "sessionsCount",
        COUNT(DISTINCT rs.credential_id)::int AS "uniqueCredentials",
        COALESCE(SUM(COALESCE(rs."totalBytes", 0)), 0) AS "totalBytes",
        COALESCE(SUM(COALESCE(rs."sessionTimeSec", 0)), 0)::int AS "totalSessionTimeSec"
      FROM wf_radius_session rs
      LEFT JOIN wf_credential c ON c.id = rs.credential_id
      WHERE (rs.org_id = ${orgId} OR c.org_id = ${orgId})
        AND rs.started_at >= ${periodFrom}
        AND rs.started_at <= ${periodTo}
        AND COALESCE(rs.station_id, c.station_id) IN (${Prisma.join(stationIds)})
      GROUP BY 1
    `,
    prisma.$queryRaw<LiveRadiusDayRow[]>`
      SELECT
        (timezone('Asia/Yangon', rs.started_at))::date AS day,
        COALESCE(rs.station_id, c.station_id) AS "stationId",
        COUNT(*)::int AS "sessionsCount",
        COALESCE(SUM(COALESCE(rs."totalBytes", 0)), 0) AS "totalBytes"
      FROM wf_radius_session rs
      LEFT JOIN wf_credential c ON c.id = rs.credential_id
      WHERE (rs.org_id = ${orgId} OR c.org_id = ${orgId})
        AND rs.started_at >= ${periodFrom}
        AND rs.started_at <= ${periodTo}
        AND COALESCE(rs.station_id, c.station_id) IN (${Prisma.join(stationIds)})
      GROUP BY 1, 2
    `,
    prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(DISTINCT rs.credential_id)::int AS n
      FROM wf_radius_session rs
      LEFT JOIN wf_credential c ON c.id = rs.credential_id
      WHERE (rs.org_id = ${orgId} OR c.org_id = ${orgId})
        AND rs.started_at >= ${periodFrom}
        AND rs.started_at <= ${periodTo}
        AND COALESCE(rs.station_id, c.station_id) IN (${Prisma.join(stationIds)})
    `,
    prisma.commissionRule.findMany({
      where: { orgId, deletedAt: null, isActive: true },
      select: {
        resellerId: true,
        planId: true,
        type: true,
        value: true,
        isActive: true,
      },
    }),
  ]);

  const salesMap = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >();
  const orderIdsByStation = new Map<string, Set<string>>();
  const planSalesMap = new Map<string, PlanSalesBucket>();
  const soldPlanIds = new Set<string>();
  const salesByDay = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; siteIds: Set<string> }
  >();
  const orderIdsByDay = new Map<string, Set<string>>();

  for (const row of itemRows) {
    if (!row.stationId) continue;
    const lineTotal = row.lineTotal as Prisma.Decimal;
    const revenue = decimalToNumber(lineTotal);
    const commission = commissionForLine(
      rules,
      row.resellerId,
      row.planId,
      lineTotal,
      row.qty
    );

    const site = salesMap.get(row.stationId) ?? {
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    const seen = orderIdsByStation.get(row.stationId) ?? new Set<string>();
    if (!seen.has(row.orderId)) {
      seen.add(row.orderId);
      orderIdsByStation.set(row.stationId, seen);
      site.ordersCount += 1;
    }
    site.itemsCount += row.qty;
    site.revenue += revenue;
    site.commission += commission;
    site.netRevenue = site.revenue - site.commission;
    salesMap.set(row.stationId, site);

    if (row.planId) {
      soldPlanIds.add(row.planId);
      const key = planBucketKey(row.stationId, row.planId);
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
      siteIds: new Set<string>(),
    };
    const daySeen = orderIdsByDay.get(dayKey) ?? new Set<string>();
    if (!daySeen.has(row.orderId)) {
      daySeen.add(row.orderId);
      orderIdsByDay.set(dayKey, daySeen);
      day.ordersCount += 1;
    }
    day.itemsCount += row.qty;
    day.revenue += revenue;
    day.commission += commission;
    day.siteIds.add(row.stationId);
    salesByDay.set(dayKey, day);
  }

  const usageMap = new Map<
    string,
    { sessionsCount: number; uniqueCredentials: number; totalBytes: number }
  >();
  for (const row of radiusSiteRows) {
    if (!row.stationId) continue;
    usageMap.set(row.stationId, {
      sessionsCount: row.sessionsCount,
      uniqueCredentials: row.uniqueCredentials,
      totalBytes: bigintToNumber(typeof row.totalBytes === 'bigint' ? row.totalBytes : BigInt(row.totalBytes)),
    });
  }

  const usageByDay = new Map<
    string,
    { sessionsCount: number; totalBytes: number; siteIds: Set<string> }
  >();
  for (const row of radiusDayRows) {
    if (!row.stationId) continue;
    const dayKey = utcDayKey(row.day);
    const day = usageByDay.get(dayKey) ?? {
      sessionsCount: 0,
      totalBytes: 0,
      siteIds: new Set<string>(),
    };
    day.sessionsCount += row.sessionsCount;
    day.totalBytes += bigintToNumber(
      typeof row.totalBytes === 'bigint' ? row.totalBytes : BigInt(row.totalBytes)
    );
    if (row.sessionsCount > 0) day.siteIds.add(row.stationId);
    usageByDay.set(dayKey, day);
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

  const bySite = mergeSiteRows(stations, salesMap, usageMap, planSalesMap, resolvedPlans);
  const summary = emptySummary(stations.length);
  summary.ordersCount = bySite.reduce((s, r) => s + r.ordersCount, 0);
  summary.itemsCount = bySite.reduce((s, r) => s + r.itemsCount, 0);
  summary.revenue = Math.round(bySite.reduce((s, r) => s + r.revenue, 0) * 100) / 100;
  summary.commission = Math.round(bySite.reduce((s, r) => s + r.commission, 0) * 100) / 100;
  summary.netRevenue = Math.round((summary.revenue - summary.commission) * 100) / 100;
  summary.sessionsCount = bySite.reduce((s, r) => s + r.sessionsCount, 0);
  summary.uniqueCredentials = Number(uniqueCredRows[0]?.n ?? 0);
  summary.totalBytes = bySite.reduce((s, r) => s + r.totalBytes, 0);
  summary.totalSessionTimeSec = radiusSiteRows.reduce((s, r) => s + r.totalSessionTimeSec, 0);
  summary.activeSiteCount = bySite.filter((s) => s.ordersCount > 0 || s.sessionsCount > 0).length;

  return {
    summary,
    previousSummary: emptySummary(stations.length),
    dailyTrend: mergeDailyTrend(salesByDay, usageByDay, periodFrom, periodTo),
    bySite,
    byTier: buildByTier(bySite, resolvedPlans),
    plans: resolvedPlans,
    planTotals: buildPlanTotals(bySite, resolvedPlans),
    dataSource: 'live',
    trendGrain: 'day',
    statsCoverage: null,
    pagination: { page: 1, limit: bySite.length || 10, total: bySite.length },
  };
}

export async function buildSiteAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: { stationId?: string; stationSizeId?: string; allowedStationIds?: string[] | null },
  options?: {
    view?: SiteAnalyticsView;
    page?: number;
    limit?: number;
    source?: SiteAnalyticsSource;
  }
): Promise<SiteAnalyticsPayload> {
  const view = options?.view ?? 'stats';
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const source: SiteAnalyticsSource = options?.source ?? 'aggregated';
  const opts: AggregateViewOptions = { view, page, limit };

  const [stations, plans] = await Promise.all([
    loadStationMeta(
      prisma,
      orgId,
      filters?.stationSizeId,
      filters?.stationId,
      filters?.allowedStationIds
    ),
    view === 'sites' || view === 'tiers' ? loadPlanMeta(prisma, orgId) : Promise.resolve([] as PlanMeta[]),
  ]);
  const stationIds = stations.map((s) => s.id);

  if (stations.length === 0) {
    return emptyPayload(0, stations, plans, periodFrom, periodTo, source, view);
  }

  const prev = previousPeriod(periodFrom, periodTo);

  const current =
    source === 'live'
      ? await aggregateFromLiveOrders(
          prisma,
          orgId,
          stationIds,
          stations,
          plans,
          periodFrom,
          periodTo
        )
      : await aggregateFromDailyStats(
          prisma,
          orgId,
          stationIds,
          stations,
          plans,
          periodFrom,
          periodTo
        );

  const previousSummary =
    view === 'stats'
      ? source === 'live'
        ? (
            await aggregateFromLiveOrders(
              prisma,
              orgId,
              stationIds,
              stations,
              plans,
              prev.from,
              prev.to
            )
          ).summary
        : await summaryFromDailyStats(
            prisma,
            orgId,
            stationIds,
            stations.length,
            prev.from,
            prev.to
          )
      : emptySummary(stations.length);

  const { grain, useHourly } = resolveTrend(periodFrom, periodTo, view);
  const dailyTrend = useHourly
    ? await buildHourlyTrendFromLive(prisma, orgId, stationIds, periodFrom, periodTo)
    : current.dailyTrend;

  return shapeForView(
    {
      summary: current.summary,
      previousSummary,
      dailyTrend,
      bySiteFull: current.bySite,
      plans: current.plans.length > 0 ? current.plans : plans,
      dataSource: current.dataSource,
      trendGrain: grain,
      statsCoverage: current.statsCoverage,
    },
    opts
  );
}

