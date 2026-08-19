import { Prisma, PrismaClient } from '@/generated/prisma/client';
import {
  appDayKey as utcDayKey,
  appHourKey,
  eachAppDay,
  eachAppHour,
  previousAppPeriod,
  resolvePeriodFromPresetDays,
} from '@/utils/app-time';

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
  bucket: string;
  label: string;
  itemsCount: number;
  revenue: number;
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
  tierId: string | null;
  tierCode: string;
  tierName: string;
  siteCount: number;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  sessionsCount: number;
  totalBytes: number;
};

export type PlanTrendSeries = {
  planId: string;
  code: string;
  name: string;
  points: PlanDailyPoint[];
};

export type PlanAnalyticsPayload = {
  summary: PlanAnalyticsSummary;
  previousSummary: PlanAnalyticsSummary;
  trendGranularity: 'hourly' | 'daily';
  trendByPlan: PlanTrendSeries[];
  byPlan: PlanRow[];
  byTier: PlanQuotaTypeRow[];
  dataSource: 'aggregated' | 'live';
};

type PlanMeta = {
  id: string;
  code: string;
  name: string;
  quotaType: string;
  isActive: boolean;
};

type StationTierMeta = {
  tierId: string | null;
  tierCode: string;
  tierName: string;
};

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
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

type SalesStatRow = {
  date: Date;
  planId: string | null;
  stationId: string | null;
  ordersCount: number;
  itemsCount: number;
  revenue: Prisma.Decimal;
  commission: Prisma.Decimal;
  netRevenue: Prisma.Decimal;
};

function dayLabel(date: Date): string {
  const key = utcDayKey(date);
  const parts = key.split('-');
  return `${Number(parts[2])}/${Number(parts[1])}`;
}

function buildDailyBuckets(from: Date, to: Date): Array<{ key: string; label: string }> {
  return eachAppDay(from, to).map((cursor) => ({
    key: utcDayKey(cursor),
    label: dayLabel(cursor),
  }));
}

function buildHourlyBuckets(from: Date, to: Date): Array<{ key: string; label: string }> {
  return eachAppHour(from, to).map((cursor) => ({
    key: appHourKey(cursor),
    label: appHourKey(cursor).slice(11, 16),
  }));
}

function emptyTrendSeries(
  plans: PlanMeta[],
  buckets: Array<{ key: string; label: string }>
): PlanTrendSeries[] {
  return plans.map((plan) => ({
    planId: plan.id,
    code: plan.code,
    name: plan.name,
    points: buckets.map((b) => ({ bucket: b.key, label: b.label, itemsCount: 0, revenue: 0 })),
  }));
}

function salesStatWhere(
  orgId: string,
  planIds: string[],
  periodFrom: Date,
  periodTo: Date,
  filters?: { stationId?: string; resellerId?: string; allowedStationIds?: string[] }
) {
  const stationScope =
    filters?.stationId
      ? { stationId: filters.stationId }
      : filters?.allowedStationIds
        ? { stationId: { in: filters.allowedStationIds } }
        : {};
  return {
    orgId,
    deletedAt: null,
    date: { gte: periodFrom, lte: periodTo },
    ...stationScope,
    ...(filters?.resellerId ? { resellerId: filters.resellerId } : {}),
    planId: { in: planIds },
  };
}

function buildTrendFromSalesRows(
  plans: PlanMeta[],
  rows: SalesStatRow[],
  periodFrom: Date,
  periodTo: Date
): PlanTrendSeries[] {
  const buckets = buildDailyBuckets(periodFrom, periodTo);
  const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
  const series = emptyTrendSeries(plans, buckets);
  const seriesIndex = new Map(series.map((s, i) => [s.planId, i]));

  for (const row of rows) {
    if (!row.planId) continue;
    const sidx = seriesIndex.get(row.planId);
    const pointIdx = bucketIndex.get(utcDayKey(row.date));
    if (sidx == null || pointIdx == null) continue;
    const point = series[sidx].points[pointIdx];
    point.itemsCount += row.itemsCount;
    point.revenue += decimalToNumber(row.revenue);
  }

  return series;
}

function buildTierFromSalesRows(
  rows: SalesStatRow[],
  stationTierMap: Map<string, StationTierMeta>
): PlanQuotaTypeRow[] {
  const map = new Map<
    string,
    PlanQuotaTypeRow & { stationIds: Set<string> }
  >();

  for (const row of rows) {
    const meta = row.stationId ? stationTierMap.get(row.stationId) : null;
    const tierId = meta?.tierId ?? null;
    const tierCode = meta?.tierCode ?? 'UNKNOWN';
    const tierName = meta?.tierName ?? 'Unknown';
    const key = tierId ?? 'unknown';
    const bucket =
      map.get(key) ??
      ({
        tierId,
        tierCode,
        tierName,
        siteCount: 0,
        ordersCount: 0,
        itemsCount: 0,
        revenue: 0,
        sessionsCount: 0,
        totalBytes: 0,
        stationIds: new Set<string>(),
      } as PlanQuotaTypeRow & { stationIds: Set<string> });
    if (row.stationId) bucket.stationIds.add(row.stationId);
    bucket.ordersCount += row.ordersCount;
    bucket.itemsCount += row.itemsCount;
    bucket.revenue += decimalToNumber(row.revenue);
    map.set(key, bucket);
  }

  return [...map.values()]
    .map((row) => ({
      tierId: row.tierId,
      tierCode: row.tierCode,
      tierName: row.tierName,
      siteCount: row.stationIds.size,
      ordersCount: row.ordersCount,
      itemsCount: row.itemsCount,
      revenue: Math.round(row.revenue * 100) / 100,
      sessionsCount: 0,
      totalBytes: 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function resolvePeriodFromPreset(
  preset: string,
  periodTo: Date = new Date()
): { periodFrom: Date; periodTo: Date } {
  const days = preset === 'today' ? 1 : preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  return resolvePeriodFromPresetDays(days, periodTo);
}

export function previousPeriod(periodFrom: Date, periodTo: Date): { from: Date; to: Date } {
  return previousAppPeriod(periodFrom, periodTo);
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
  >
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
        sessionsCount: 0,
        uniqueCredentials: 0,
        totalBytes: 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.itemsCount - a.itemsCount);
}

function summarizeSalesRows(plans: PlanMeta[], rows: SalesStatRow[]): {
  summary: PlanAnalyticsSummary;
  byPlan: PlanRow[];
} {
  const salesMap = new Map<
    string,
    { ordersCount: number; itemsCount: number; revenue: number; commission: number; netRevenue: number }
  >();
  const summary = emptySummary(plans.length);

  for (const row of rows) {
    if (!row.planId) continue;
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
  }

  summary.revenue = Math.round(summary.revenue * 100) / 100;
  summary.commission = Math.round(summary.commission * 100) / 100;
  summary.netRevenue = Math.round(summary.netRevenue * 100) / 100;
  const byPlan = mergePlanRows(plans, salesMap);
  summary.activePlanCount = byPlan.filter((p) => p.ordersCount > 0 || p.itemsCount > 0).length;
  return { summary, byPlan };
}

async function loadHourlyTrendFromOrders(
  prisma: PrismaClient,
  orgId: string,
  plans: PlanMeta[],
  periodFrom: Date,
  periodTo: Date,
  filters?: { stationId?: string; resellerId?: string; allowedStationIds?: string[] }
): Promise<PlanTrendSeries[]> {
  const planIds = plans.map((p) => p.id);
  const buckets = buildHourlyBuckets(periodFrom, periodTo);
  if (planIds.length === 0) return [];
  if (filters?.allowedStationIds && filters.allowedStationIds.length === 0) {
    return emptyTrendSeries(plans, buckets);
  }

  const stationFilter = filters?.stationId
    ? Prisma.sql`AND so.station_id = ${filters.stationId}`
    : filters?.allowedStationIds
      ? Prisma.sql`AND so.station_id IN (${Prisma.join(filters.allowedStationIds)})`
      : Prisma.empty;
  const resellerFilter = filters?.resellerId
    ? Prisma.sql`AND so.reseller_id = ${filters.resellerId}`
    : Prisma.empty;

  type HourlyRow = { bucket: string; planId: string; itemsCount: number; revenue: number };
  const rows = await prisma.$queryRaw<HourlyRow[]>`
    SELECT
      to_char(timezone('Asia/Yangon', so.sold_at), 'YYYY-MM-DD"T"HH24":00:00') AS bucket,
      si.plan_id AS "planId",
      COALESCE(SUM(si.qty), 0)::int AS "itemsCount",
      COALESCE(SUM(si.line_total), 0)::float AS revenue
    FROM wf_sale_order so
    INNER JOIN wf_sale_item si ON si.order_id = so.id
    WHERE so.org_id = ${orgId}
      AND so.status = 'PAID'
      AND so.sold_at >= ${periodFrom}
      AND so.sold_at <= ${periodTo}
      AND si.plan_id IN (${Prisma.join(planIds)})
      ${stationFilter}
      ${resellerFilter}
    GROUP BY 1, 2
  `;

  const series = emptyTrendSeries(plans, buckets);
  const seriesIndex = new Map(series.map((s, i) => [s.planId, i]));
  const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));

  for (const row of rows) {
    const sidx = seriesIndex.get(row.planId);
    const pointIdx = bucketIndex.get(row.bucket);
    if (sidx == null || pointIdx == null) continue;
    const point = series[sidx].points[pointIdx];
    point.itemsCount += Number(row.itemsCount) || 0;
    point.revenue += Number(row.revenue) || 0;
  }

  return series;
}

async function loadDailySalesRows(
  prisma: PrismaClient,
  orgId: string,
  planIds: string[],
  periodFrom: Date,
  periodTo: Date,
  filters?: { stationId?: string; resellerId?: string; allowedStationIds?: string[] }
): Promise<SalesStatRow[]> {
  if (planIds.length === 0) return [];
  return prisma.dailySalesStat.findMany({
    where: salesStatWhere(orgId, planIds, periodFrom, periodTo, filters),
    select: {
      date: true,
      planId: true,
      stationId: true,
      ordersCount: true,
      itemsCount: true,
      revenue: true,
      commission: true,
      netRevenue: true,
    },
  });
}

export async function buildPlanAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: {
    planId?: string;
    quotaType?: string;
    stationId?: string;
    resellerId?: string;
    allowedStationIds?: string[];
  }
): Promise<PlanAnalyticsPayload> {
  const plans = await loadPlanMeta(prisma, orgId, filters);
  const planIds = plans.map((p) => p.id);

  if (plans.length === 0) {
    return {
      summary: emptySummary(0),
      previousSummary: emptySummary(0),
      trendGranularity: 'daily',
      trendByPlan: [],
      byPlan: [],
      byTier: [],
      dataSource: 'aggregated',
    };
  }

  const prev = previousPeriod(periodFrom, periodTo);
  const sameDay = utcDayKey(periodFrom) === utcDayKey(periodTo);
  const [salesRows, prevRows, stations, hourlyTrend] = await Promise.all([
    loadDailySalesRows(prisma, orgId, planIds, periodFrom, periodTo, filters),
    loadDailySalesRows(prisma, orgId, planIds, prev.from, prev.to, filters),
    prisma.wifiStation.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(filters?.allowedStationIds ? { id: { in: filters.allowedStationIds } } : {}),
        ...(filters?.stationId ? { id: filters.stationId } : {}),
      },
      select: {
        id: true,
        stationSize: { select: { id: true, code: true, name: true } },
      },
    }),
    sameDay
      ? loadHourlyTrendFromOrders(prisma, orgId, plans, periodFrom, periodTo, filters)
      : Promise.resolve(null),
  ]);

  const current = summarizeSalesRows(plans, salesRows);
  const previous = summarizeSalesRows(plans, prevRows);
  const stationTierMap = new Map<string, StationTierMeta>(
    stations.map((s) => [
      s.id,
      {
        tierId: s.stationSize?.id ?? null,
        tierCode: s.stationSize?.code ?? 'UNKNOWN',
        tierName: s.stationSize?.name ?? 'Unknown',
      },
    ])
  );

  return {
    summary: current.summary,
    previousSummary: previous.summary,
    trendGranularity: sameDay ? 'hourly' : 'daily',
    trendByPlan: hourlyTrend ?? buildTrendFromSalesRows(plans, salesRows, periodFrom, periodTo),
    byPlan: current.byPlan,
    byTier: buildTierFromSalesRows(salesRows, stationTierMap),
    dataSource: 'aggregated',
  };
}
