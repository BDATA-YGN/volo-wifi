import { Prisma, PrismaClient } from '@/generated/prisma/client';
import {
  APP_TIMEZONE,
  appDayKey as utcDayKey,
  appHourKey,
  eachAppDay,
  eachAppHour,
  previousAppPeriod,
  resolvePeriodFromPresetDays,
} from '@/utils/app-time';

const ACTIVE_STATUSES = ['ACTIVATED', 'PAUSED', 'SOLD'] as const;
const TERMINAL_STATUSES = ['EXPIRED', 'REVOKED', 'CONSUMED'] as const;

export type CredentialAnalyticsSummary = {
  inventoryCount: number;
  activeCount: number;
  terminalCount: number;
  soldInPeriod: number;
  activatedInPeriod: number;
  expiredInPeriod: number;
  revokedInPeriod: number;
  consumedInPeriod: number;
  archivedInPeriod: number;
};

export type CredentialDailyPoint = {
  date: string;
  sold: number;
  activated: number;
  expired: number;
  revoked: number;
  archived: number;
};

export type TrendGranularity = 'daily' | 'hourly';

export type CredentialPeriodCounts = {
  sold: number;
  activated: number;
  expired: number;
  revoked: number;
  consumed: number;
  archived: number;
};

export type CredentialSitePlanRow = CredentialPeriodCounts & {
  planId: string;
  code: string;
  name: string;
};

export type CredentialSiteRow = CredentialPeriodCounts & {
  stationId: string | null;
  code: string;
  name: string;
  byPlan: CredentialSitePlanRow[];
};

export type CredentialAnalyticsPayload = {
  summary: CredentialAnalyticsSummary;
  previousSummary: CredentialAnalyticsSummary;
  dailyTrend: CredentialDailyPoint[];
  trendGranularity: TrendGranularity;
  bySite: CredentialSiteRow[];
};

type CredentialFilters = {
  planId?: string;
  type?: string;
};

type BucketCountRow = { bucket: string; count: number };
type StationPlanCountRow = { stationId: string | null; planId: string; count: number };

const PERIOD_COUNT_KEYS = ['sold', 'activated', 'expired', 'revoked', 'consumed', 'archived'] as const;

function emptyPeriodCounts(): CredentialPeriodCounts {
  return { sold: 0, activated: 0, expired: 0, revoked: 0, consumed: 0, archived: 0 };
}

function addPeriodCount(
  target: CredentialPeriodCounts,
  key: (typeof PERIOD_COUNT_KEYS)[number],
  value: number
) {
  target[key] += value;
}

function hasPeriodActivity(counts: CredentialPeriodCounts): boolean {
  return PERIOD_COUNT_KEYS.some((key) => counts[key] > 0);
}

function emptySummary(): CredentialAnalyticsSummary {
  return {
    inventoryCount: 0,
    activeCount: 0,
    terminalCount: 0,
    soldInPeriod: 0,
    activatedInPeriod: 0,
    expiredInPeriod: 0,
    revokedInPeriod: 0,
    consumedInPeriod: 0,
    archivedInPeriod: 0,
  };
}

function isSingleAppDay(periodFrom: Date, periodTo: Date): boolean {
  return utcDayKey(periodFrom) === utcDayKey(periodTo);
}

function mergeTrend(
  soldByBucket: Map<string, number>,
  activatedByBucket: Map<string, number>,
  expiredByBucket: Map<string, number>,
  revokedByBucket: Map<string, number>,
  archivedByBucket: Map<string, number>,
  periodFrom: Date,
  periodTo: Date,
  grain: TrendGranularity
): CredentialDailyPoint[] {
  const buckets =
    grain === 'hourly' ? eachAppHour(periodFrom, periodTo) : eachAppDay(periodFrom, periodTo);
  return buckets.map((cursor) => {
    const key = grain === 'hourly' ? appHourKey(cursor) : utcDayKey(cursor);
    return {
      date: key,
      sold: soldByBucket.get(key) ?? 0,
      activated: activatedByBucket.get(key) ?? 0,
      expired: expiredByBucket.get(key) ?? 0,
      revoked: revokedByBucket.get(key) ?? 0,
      archived: archivedByBucket.get(key) ?? 0,
    };
  });
}

function toBucketMap(rows: BucketCountRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.bucket) continue;
    map.set(String(row.bucket), Number(row.count) || 0);
  }
  return map;
}

function sumMap(map: Map<string, number>): number {
  let total = 0;
  for (const value of map.values()) total += value;
  return total;
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

function baseCredentialWhere(orgId: string, filters?: CredentialFilters): Prisma.CredentialWhereInput {
  return {
    orgId,
    deletedAt: null,
    ...(filters?.planId ? { planId: filters.planId } : {}),
    ...(filters?.type ? { type: filters.type as 'VOUCHER_TOKEN' | 'USER_PASSWORD' } : {}),
  };
}

function planFilterSql(filters?: CredentialFilters): Prisma.Sql {
  return filters?.planId ? Prisma.sql`AND plan_id = ${filters.planId}` : Prisma.empty;
}

function typeFilterSql(filters?: CredentialFilters): Prisma.Sql {
  return filters?.type ? Prisma.sql`AND type::text = ${filters.type}` : Prisma.empty;
}

/** Literal timezone so Prisma does not bind it as a UUID/date parameter. */
const APP_TZ_SQL = Prisma.raw(`'${APP_TIMEZONE}'`);

function bucketSelectSql(
  column: 'sold_at' | 'activated_at' | 'expires_at' | 'revoked_at' | 'archived_at',
  grain: TrendGranularity
): Prisma.Sql {
  const col = Prisma.raw(column);
  if (grain === 'hourly') {
    return Prisma.sql`to_char(timezone(${APP_TZ_SQL}, ${col}), 'YYYY-MM-DD"T"HH24":00:00')`;
  }
  return Prisma.sql`to_char((${col} AT TIME ZONE ${APP_TZ_SQL})::date, 'YYYY-MM-DD')`;
}

async function countByAppBucket(
  prisma: PrismaClient,
  column: 'sold_at' | 'activated_at' | 'expires_at' | 'revoked_at',
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  grain: TrendGranularity,
  filters?: CredentialFilters
): Promise<Map<string, number>> {
  const planSql = planFilterSql(filters);
  const typeSql = typeFilterSql(filters);
  const col = Prisma.raw(column);
  const bucketSql = bucketSelectSql(column, grain);
  const rows = await prisma.$queryRaw<BucketCountRow[]>`
    SELECT ${bucketSql} AS bucket, COUNT(*)::int AS count
    FROM wf_credential
    WHERE org_id = ${orgId}
      AND deleted_at IS NULL
      ${planSql}
      ${typeSql}
      AND ${col} >= ${periodFrom}
      AND ${col} <= ${periodTo}
    GROUP BY 1
  `;
  return toBucketMap(rows);
}

async function countArchivedByAppBucket(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  grain: TrendGranularity,
  filters?: CredentialFilters
): Promise<Map<string, number>> {
  const bucketSql = bucketSelectSql('archived_at', grain);
  const rows = await prisma.$queryRaw<BucketCountRow[]>`
    SELECT ${bucketSql} AS bucket, COUNT(*)::int AS count
    FROM wf_credential_archive
    WHERE org_id = ${orgId}
      ${planFilterSql(filters)}
      ${typeFilterSql(filters)}
      AND archived_at >= ${periodFrom}
      AND archived_at <= ${periodTo}
    GROUP BY 1
  `;
  return toBucketMap(rows);
}

async function countStationPlanByColumn(
  prisma: PrismaClient,
  column: 'sold_at' | 'activated_at' | 'expires_at' | 'revoked_at',
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: CredentialFilters
): Promise<StationPlanCountRow[]> {
  const col = Prisma.raw(column);
  return prisma.$queryRaw<StationPlanCountRow[]>`
    SELECT station_id AS "stationId", plan_id AS "planId", COUNT(*)::int AS count
    FROM wf_credential
    WHERE org_id = ${orgId}
      AND deleted_at IS NULL
      ${planFilterSql(filters)}
      ${typeFilterSql(filters)}
      AND ${col} IS NOT NULL
      AND ${col} >= ${periodFrom}
      AND ${col} <= ${periodTo}
    GROUP BY 1, 2
  `;
}

async function countConsumedByStationPlan(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: CredentialFilters
): Promise<StationPlanCountRow[]> {
  return prisma.$queryRaw<StationPlanCountRow[]>`
    SELECT station_id AS "stationId", plan_id AS "planId", COUNT(*)::int AS count
    FROM wf_credential
    WHERE org_id = ${orgId}
      AND deleted_at IS NULL
      ${planFilterSql(filters)}
      ${typeFilterSql(filters)}
      AND status::text = 'CONSUMED'
      AND updated_at >= ${periodFrom}
      AND updated_at <= ${periodTo}
    GROUP BY 1, 2
  `;
}

async function countArchivedByStationPlan(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: CredentialFilters
): Promise<StationPlanCountRow[]> {
  return prisma.$queryRaw<StationPlanCountRow[]>`
    SELECT station_id AS "stationId", plan_id AS "planId", COUNT(*)::int AS count
    FROM wf_credential_archive
    WHERE org_id = ${orgId}
      ${planFilterSql(filters)}
      ${typeFilterSql(filters)}
      AND archived_at >= ${periodFrom}
      AND archived_at <= ${periodTo}
    GROUP BY 1, 2
  `;
}

async function loadSiteBreakdown(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: CredentialFilters
): Promise<CredentialSiteRow[]> {
  const [sold, activated, expired, revoked, consumed, archived, stations, plans] = await Promise.all([
    countStationPlanByColumn(prisma, 'sold_at', orgId, periodFrom, periodTo, filters),
    countStationPlanByColumn(prisma, 'activated_at', orgId, periodFrom, periodTo, filters),
    countStationPlanByColumn(prisma, 'expires_at', orgId, periodFrom, periodTo, filters),
    countStationPlanByColumn(prisma, 'revoked_at', orgId, periodFrom, periodTo, filters),
    countConsumedByStationPlan(prisma, orgId, periodFrom, periodTo, filters),
    countArchivedByStationPlan(prisma, orgId, periodFrom, periodTo, filters),
    prisma.wifiStation.findMany({
      where: { orgId, deletedAt: null },
      select: { id: true, code: true, name: true },
    }),
    prisma.plan.findMany({
      where: { orgId, deletedAt: null },
      select: { id: true, code: true, name: true },
    }),
  ]);

  const stationLookup = new Map(stations.map((s) => [s.id, s]));
  const planLookup = new Map(plans.map((p) => [p.id, p]));
  const siteMap = new Map<string, CredentialSiteRow>();
  const siteKey = (stationId: string | null) => stationId ?? '';

  const ensureSite = (stationId: string | null): CredentialSiteRow => {
    const key = siteKey(stationId);
    const existing = siteMap.get(key);
    if (existing) return existing;
    const station = stationId ? stationLookup.get(stationId) : null;
    const created: CredentialSiteRow = {
      stationId,
      code: station?.code ?? (stationId ? stationId.slice(0, 8) : 'UNASSIGNED'),
      name: station?.name ?? (stationId ? 'Unknown site' : 'Unassigned'),
      ...emptyPeriodCounts(),
      byPlan: [],
    };
    siteMap.set(key, created);
    return created;
  };

  const planIndex = new Map<string, Map<string, CredentialSitePlanRow>>();

  const ensurePlan = (stationId: string | null, planId: string): CredentialSitePlanRow => {
    const site = ensureSite(stationId);
    const key = siteKey(stationId);
    let plansForSite = planIndex.get(key);
    if (!plansForSite) {
      plansForSite = new Map();
      planIndex.set(key, plansForSite);
    }
    const existing = plansForSite.get(planId);
    if (existing) return existing;
    const plan = planLookup.get(planId);
    const created: CredentialSitePlanRow = {
      planId,
      code: plan?.code ?? planId.slice(0, 8),
      name: plan?.name ?? 'Unknown plan',
      ...emptyPeriodCounts(),
    };
    plansForSite.set(planId, created);
    site.byPlan.push(created);
    return created;
  };

  const applyRows = (
    rows: StationPlanCountRow[],
    metric: (typeof PERIOD_COUNT_KEYS)[number]
  ) => {
    for (const row of rows) {
      const count = Number(row.count) || 0;
      if (count <= 0 || !row.planId) continue;
      addPeriodCount(ensureSite(row.stationId), metric, count);
      addPeriodCount(ensurePlan(row.stationId, row.planId), metric, count);
    }
  };

  applyRows(sold, 'sold');
  applyRows(activated, 'activated');
  applyRows(expired, 'expired');
  applyRows(revoked, 'revoked');
  applyRows(consumed, 'consumed');
  applyRows(archived, 'archived');

  const rows = [...siteMap.values()].filter(hasPeriodActivity);
  for (const site of rows) {
    site.byPlan = site.byPlan
      .filter(hasPeriodActivity)
      .sort((a, b) => b.sold - a.sold || b.activated - a.activated);
  }
  rows.sort((a, b) => b.sold - a.sold || b.activated - a.activated || a.name.localeCompare(b.name));
  return rows;
}


async function loadPeriodCounts(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: CredentialFilters
): Promise<Pick<
  CredentialAnalyticsSummary,
  'soldInPeriod' | 'activatedInPeriod' | 'expiredInPeriod' | 'revokedInPeriod' | 'consumedInPeriod' | 'archivedInPeriod'
>> {
  const where = baseCredentialWhere(orgId, filters);
  const inPeriod = { gte: periodFrom, lte: periodTo };
  const [soldInPeriod, activatedInPeriod, expiredInPeriod, revokedInPeriod, consumedInPeriod, archivedInPeriod] =
    await Promise.all([
      prisma.credential.count({ where: { ...where, soldAt: inPeriod } }),
      prisma.credential.count({ where: { ...where, activatedAt: inPeriod } }),
      prisma.credential.count({ where: { ...where, expiresAt: inPeriod } }),
      prisma.credential.count({ where: { ...where, revokedAt: inPeriod } }),
      prisma.credential.count({
        where: { ...where, status: 'CONSUMED', updatedAt: inPeriod },
      }),
      prisma.credentialArchive.count({
        where: {
          orgId,
          archivedAt: inPeriod,
          ...(filters?.planId ? { planId: filters.planId } : {}),
          ...(filters?.type ? { type: filters.type as 'VOUCHER_TOKEN' | 'USER_PASSWORD' } : {}),
        },
      }),
    ]);

  return {
    soldInPeriod,
    activatedInPeriod,
    expiredInPeriod,
    revokedInPeriod,
    consumedInPeriod,
    archivedInPeriod,
  };
}

async function loadCurrentPeriod(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: CredentialFilters
): Promise<{
  summary: CredentialAnalyticsSummary;
  dailyTrend: CredentialDailyPoint[];
  trendGranularity: TrendGranularity;
}> {
  const where = baseCredentialWhere(orgId, filters);
  const inPeriod = { gte: periodFrom, lte: periodTo };
  const grain: TrendGranularity = isSingleAppDay(periodFrom, periodTo) ? 'hourly' : 'daily';

  const [soldByDay, activatedByDay, expiredByDay, revokedByDay, archivedByDay, consumedInPeriod] =
    await Promise.all([
      countByAppBucket(prisma, 'sold_at', orgId, periodFrom, periodTo, grain, filters),
      countByAppBucket(prisma, 'activated_at', orgId, periodFrom, periodTo, grain, filters),
      countByAppBucket(prisma, 'expires_at', orgId, periodFrom, periodTo, grain, filters),
      countByAppBucket(prisma, 'revoked_at', orgId, periodFrom, periodTo, grain, filters),
      countArchivedByAppBucket(prisma, orgId, periodFrom, periodTo, grain, filters),
      prisma.credential.count({
        where: { ...where, status: 'CONSUMED', updatedAt: inPeriod },
      }),
    ]);

  const summary = emptySummary();
  summary.soldInPeriod = sumMap(soldByDay);
  summary.activatedInPeriod = sumMap(activatedByDay);
  summary.expiredInPeriod = sumMap(expiredByDay);
  summary.revokedInPeriod = sumMap(revokedByDay);
  summary.archivedInPeriod = sumMap(archivedByDay);
  summary.consumedInPeriod = consumedInPeriod;

  return {
    summary,
    dailyTrend: mergeTrend(
      soldByDay,
      activatedByDay,
      expiredByDay,
      revokedByDay,
      archivedByDay,
      periodFrom,
      periodTo,
      grain
    ),
    trendGranularity: grain,
  };
}

export async function buildCredentialAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: CredentialFilters
): Promise<CredentialAnalyticsPayload> {
  const where = baseCredentialWhere(orgId, filters);
  const prev = previousPeriod(periodFrom, periodTo);

  const [inventoryGroups, currentPeriod, previousCounts, bySite] = await Promise.all([
    prisma.credential.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
    loadCurrentPeriod(prisma, orgId, periodFrom, periodTo, filters),
    loadPeriodCounts(prisma, orgId, prev.from, prev.to, filters),
    loadSiteBreakdown(prisma, orgId, periodFrom, periodTo, filters),
  ]);

  let inventoryCount = 0;
  let activeCount = 0;
  let terminalCount = 0;

  for (const row of inventoryGroups) {
    const count = row._count._all;
    inventoryCount += count;
    if ((ACTIVE_STATUSES as readonly string[]).includes(row.status)) activeCount += count;
    if ((TERMINAL_STATUSES as readonly string[]).includes(row.status)) terminalCount += count;
  }

  const summary: CredentialAnalyticsSummary = {
    ...currentPeriod.summary,
    inventoryCount,
    activeCount,
    terminalCount,
  };

  const previousSummary: CredentialAnalyticsSummary = {
    ...emptySummary(),
    ...previousCounts,
    inventoryCount,
    activeCount,
    terminalCount,
  };

  return {
    summary,
    previousSummary,
    dailyTrend: currentPeriod.dailyTrend,
    trendGranularity: currentPeriod.trendGranularity,
    bySite,
  };
}
