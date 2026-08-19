import { Prisma, PrismaClient } from '@/generated/prisma/client';
import {
  appDayKey as utcDayKey,
  appHourKey,
  eachAppDay,
  eachAppHour,
  previousAppPeriod,
  resolvePeriodFromPresetDays,
} from '@/utils/app-time';

export type SessionTrafficSummary = {
  sessionsCount: number;
  uniqueCredentials: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  totalBytes: number;
  totalSessionTimeSec: number;
  avgSessionTimeSec: number;
  avgBytesPerSession: number;
  activeSessionsNow: number;
  activeBytesNow: number;
};

export type SessionTrafficDailyPoint = {
  date: string;
  sessionsCount: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  totalBytes: number;
  uniqueCredentials: number;
};

export type SessionTrafficSiteRow = {
  stationId: string;
  code: string;
  name: string;
  status: string;
  location: string | null;
  sessionsCount: number;
  uniqueCredentials: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  totalBytes: number;
  totalSessionTimeSec: number;
};

export type SessionTrafficPlanRow = {
  planId: string;
  code: string;
  name: string;
  sessionsCount: number;
  uniqueCredentials: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  totalBytes: number;
  totalSessionTimeSec: number;
};

export type SessionTrafficTerminateRow = {
  cause: string;
  count: number;
};

export type TrendGranularity = 'daily' | 'hourly';

export type SessionTrafficPayload = {
  summary: SessionTrafficSummary;
  previousSummary: SessionTrafficSummary;
  dailyTrend: SessionTrafficDailyPoint[];
  trendGranularity: TrendGranularity;
  bySite: SessionTrafficSiteRow[];
  byPlan: SessionTrafficPlanRow[];
  byTerminateCause: SessionTrafficTerminateRow[];
  dataSource: 'aggregated' | 'live';
};

type StationMeta = {
  id: string;
  code: string;
  name: string;
  status: string;
  location: string | null;
};

type PlanMeta = {
  id: string;
  code: string;
  name: string;
};

type TrafficFilters = {
  stationId?: string;
  planId?: string;
};

function bigintToNumber(value: bigint | number | string | null | undefined): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'bigint' ? Number(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sessionUserKey(session: {
  credentialId: string | null;
  userName?: string | null;
}): string | null {
  if (session.credentialId) return `c:${session.credentialId}`;
  const name = session.userName?.trim();
  return name ? `u:${name.toLowerCase()}` : null;
}

function emptySummary(): SessionTrafficSummary {
  return {
    sessionsCount: 0,
    uniqueCredentials: 0,
    totalInputBytes: 0,
    totalOutputBytes: 0,
    totalBytes: 0,
    totalSessionTimeSec: 0,
    avgSessionTimeSec: 0,
    avgBytesPerSession: 0,
    activeSessionsNow: 0,
    activeBytesNow: 0,
  };
}

function finalizeSummary(
  partial: Omit<
    SessionTrafficSummary,
    'avgSessionTimeSec' | 'avgBytesPerSession' | 'activeSessionsNow' | 'activeBytesNow'
  >,
  activeSessionsNow: number,
  activeBytesNow: number
): SessionTrafficSummary {
  return {
    ...partial,
    avgSessionTimeSec:
      partial.uniqueCredentials > 0
        ? Math.round(partial.totalSessionTimeSec / partial.uniqueCredentials)
        : 0,
    avgBytesPerSession:
      partial.sessionsCount > 0
        ? Math.round(partial.totalBytes / partial.sessionsCount)
        : 0,
    activeSessionsNow,
    activeBytesNow,
  };
}

function isSingleAppDay(periodFrom: Date, periodTo: Date): boolean {
  return utcDayKey(periodFrom) === utcDayKey(periodTo);
}

function bucketKey(date: Date, grain: TrendGranularity): string {
  return grain === 'hourly' ? appHourKey(date) : utcDayKey(date);
}

function mergeTrend(
  usageByBucket: Map<
    string,
    {
      sessionsCount: number;
      totalInputBytes: number;
      totalOutputBytes: number;
      totalBytes: number;
      uniqueCredentials: number;
    }
  >,
  periodFrom: Date,
  periodTo: Date,
  grain: TrendGranularity
): SessionTrafficDailyPoint[] {
  const buckets =
    grain === 'hourly' ? eachAppHour(periodFrom, periodTo) : eachAppDay(periodFrom, periodTo);
  return buckets.map((cursor) => {
    const key = bucketKey(cursor, grain);
    const point = usageByBucket.get(key) ?? {
      sessionsCount: 0,
      totalInputBytes: 0,
      totalOutputBytes: 0,
      totalBytes: 0,
      uniqueCredentials: 0,
    };
    return { date: key, ...point };
  });
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

async function loadStationMeta(
  prisma: PrismaClient,
  orgId: string,
  stationId?: string
): Promise<StationMeta[]> {
  const stations = await prisma.wifiStation.findMany({
    where: {
      orgId,
      deletedAt: null,
      ...(stationId ? { id: stationId } : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      location: true,
    },
    orderBy: { name: 'asc' },
  });

  return stations;
}

async function loadPlanMeta(
  prisma: PrismaClient,
  orgId: string,
  planId?: string
): Promise<PlanMeta[]> {
  const plans = await prisma.plan.findMany({
    where: {
      orgId,
      deletedAt: null,
      ...(planId ? { id: planId } : {}),
    },
    select: { id: true, code: true, name: true },
    orderBy: { name: 'asc' },
  });

  return plans;
}

async function loadActiveSessions(
  prisma: PrismaClient,
  orgId: string,
  filters?: TrafficFilters
): Promise<{ count: number; totalBytes: number }> {
  const sessions = await prisma.radiusSession.findMany({
    where: {
      orgId,
      status: { in: ['START', 'INTERIM'] },
      ...(filters?.stationId ? { stationId: filters.stationId } : {}),
      ...(filters?.planId ? { credential: { planId: filters.planId } } : {}),
    },
    select: { totalBytes: true },
  });

  return {
    count: sessions.length,
    totalBytes: sessions.reduce((sum, s) => sum + bigintToNumber(s.totalBytes), 0),
  };
}

function buildUsageWhere(
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  stationIds: string[],
  filters?: TrafficFilters
): Prisma.DailyRadiusUsageStatWhereInput {
  const stationFilter =
    filters?.stationId
      ? { stationId: filters.stationId }
      : stationIds.length > 0
        ? { stationId: { in: stationIds } }
        : { stationId: { in: [] as string[] } };

  return {
    orgId,
    deletedAt: null,
    date: { gte: periodFrom, lte: periodTo },
    ...stationFilter,
    ...(filters?.planId ? { planId: filters.planId } : {}),
  };
}

async function aggregateFromDailyStats(
  prisma: PrismaClient,
  orgId: string,
  stationIds: string[],
  stations: StationMeta[],
  plans: PlanMeta[],
  periodFrom: Date,
  periodTo: Date,
  filters?: TrafficFilters
): Promise<SessionTrafficPayload | null> {
  const stationIdSet = new Set(stationIds);
  const usageRows = await prisma.dailyRadiusUsageStat.findMany({
    where: buildUsageWhere(orgId, periodFrom, periodTo, stationIds, filters),
    select: {
      date: true,
      stationId: true,
      planId: true,
      sessionsCount: true,
      uniqueCredentials: true,
      totalInputBytes: true,
      totalOutputBytes: true,
      totalBytes: true,
      totalSessionTimeSec: true,
    },
  });

  if (usageRows.length === 0) return null;

  const siteMap = new Map<string, Omit<SessionTrafficSiteRow, 'code' | 'name' | 'status' | 'location'>>();
  const planMap = new Map<string, Omit<SessionTrafficPlanRow, 'code' | 'name'>>();
  const usageByDay = new Map<
    string,
    {
      sessionsCount: number;
      totalInputBytes: number;
      totalOutputBytes: number;
      totalBytes: number;
      uniqueCredentials: number;
    }
  >();

  const summary = emptySummary();

  for (const row of usageRows) {
    if (row.stationId && !stationIdSet.has(row.stationId)) continue;

    summary.sessionsCount += row.sessionsCount;
    summary.uniqueCredentials += row.uniqueCredentials;
    summary.totalInputBytes += bigintToNumber(row.totalInputBytes);
    summary.totalOutputBytes += bigintToNumber(row.totalOutputBytes);
    summary.totalBytes += bigintToNumber(row.totalBytes);
    summary.totalSessionTimeSec += row.totalSessionTimeSec;

    if (row.stationId) {
      const site = siteMap.get(row.stationId) ?? {
        stationId: row.stationId,
        sessionsCount: 0,
        uniqueCredentials: 0,
        totalInputBytes: 0,
        totalOutputBytes: 0,
        totalBytes: 0,
        totalSessionTimeSec: 0,
      };
      site.sessionsCount += row.sessionsCount;
      site.uniqueCredentials += row.uniqueCredentials;
      site.totalInputBytes += bigintToNumber(row.totalInputBytes);
      site.totalOutputBytes += bigintToNumber(row.totalOutputBytes);
      site.totalBytes += bigintToNumber(row.totalBytes);
      site.totalSessionTimeSec += row.totalSessionTimeSec;
      siteMap.set(row.stationId, site);
    }

    if (row.planId) {
      const plan = planMap.get(row.planId) ?? {
        planId: row.planId,
        sessionsCount: 0,
        uniqueCredentials: 0,
        totalInputBytes: 0,
        totalOutputBytes: 0,
        totalBytes: 0,
        totalSessionTimeSec: 0,
      };
      plan.sessionsCount += row.sessionsCount;
      plan.uniqueCredentials += row.uniqueCredentials;
      plan.totalInputBytes += bigintToNumber(row.totalInputBytes);
      plan.totalOutputBytes += bigintToNumber(row.totalOutputBytes);
      plan.totalBytes += bigintToNumber(row.totalBytes);
      plan.totalSessionTimeSec += row.totalSessionTimeSec;
      planMap.set(row.planId, plan);
    }

    const dayKey = utcDayKey(row.date);
    const day = usageByDay.get(dayKey) ?? {
      sessionsCount: 0,
      totalInputBytes: 0,
      totalOutputBytes: 0,
      totalBytes: 0,
      uniqueCredentials: 0,
    };
    day.sessionsCount += row.sessionsCount;
    day.totalInputBytes += bigintToNumber(row.totalInputBytes);
    day.totalOutputBytes += bigintToNumber(row.totalOutputBytes);
    day.totalBytes += bigintToNumber(row.totalBytes);
    day.uniqueCredentials += row.uniqueCredentials;
    usageByDay.set(dayKey, day);
  }

  const stationById = new Map(stations.map((s) => [s.id, s]));
  const planById = new Map(plans.map((p) => [p.id, p]));

  const bySite = [...siteMap.values()]
    .map((row) => {
      const station = stationById.get(row.stationId);
      return {
        ...row,
        code: station?.code ?? '—',
        name: station?.name ?? 'Unknown site',
        status: station?.status ?? 'UNKNOWN',
        location: station?.location ?? null,
      };
    })
    .sort((a, b) => b.totalBytes - a.totalBytes || b.sessionsCount - a.sessionsCount);

  const byPlan = [...planMap.values()]
    .map((row) => {
      const plan = planById.get(row.planId);
      return {
        ...row,
        code: plan?.code ?? '—',
        name: plan?.name ?? 'Unknown plan',
      };
    })
    .sort((a, b) => b.totalBytes - a.totalBytes || b.sessionsCount - a.sessionsCount);

  const active = await loadActiveSessions(prisma, orgId, filters);

  return {
    summary: finalizeSummary(summary, active.count, active.totalBytes),
    previousSummary: emptySummary(),
    dailyTrend: mergeTrend(usageByDay, periodFrom, periodTo, 'daily'),
    trendGranularity: 'daily',
    bySite,
    byPlan,
    byTerminateCause: [],
    dataSource: 'aggregated',
  };
}

async function aggregateFromLiveSessions(
  prisma: PrismaClient,
  orgId: string,
  stations: StationMeta[],
  plans: PlanMeta[],
  periodFrom: Date,
  periodTo: Date,
  filters?: TrafficFilters,
  grain: TrendGranularity = 'daily'
): Promise<SessionTrafficPayload> {
  const sessions = await prisma.radiusSession.findMany({
    where: {
      orgId,
      startedAt: { gte: periodFrom, lte: periodTo },
      ...(filters?.stationId ? { stationId: filters.stationId } : {}),
      ...(filters?.planId ? { credential: { planId: filters.planId } } : {}),
    },
    select: {
      stationId: true,
      credentialId: true,
      userName: true,
      startedAt: true,
      inputBytes: true,
      outputBytes: true,
      totalBytes: true,
      sessionTimeSec: true,
      terminateCause: true,
      credential: { select: { planId: true, stationId: true } },
    },
  });

  const siteMap = new Map<string, SessionTrafficSiteRow>();
  const planMap = new Map<string, SessionTrafficPlanRow>();
  const siteUserKeys = new Map<string, Set<string>>();
  const planUserKeys = new Map<string, Set<string>>();
  const usageByDay = new Map<
    string,
    {
      sessionsCount: number;
      totalInputBytes: number;
      totalOutputBytes: number;
      totalBytes: number;
      credentialIds: Set<string>;
    }
  >();
  const terminateMap = new Map<string, number>();
  const uniqueCredentialIds = new Set<string>();

  const stationById = new Map(stations.map((s) => [s.id, s]));
  const planById = new Map(plans.map((p) => [p.id, p]));

  let totalInputBytes = 0;
  let totalOutputBytes = 0;
  let totalBytes = 0;
  let totalSessionTimeSec = 0;

  for (const session of sessions) {
    const inputBytes = bigintToNumber(session.inputBytes);
    const outputBytes = bigintToNumber(session.outputBytes);
    const bytes = bigintToNumber(session.totalBytes) || inputBytes + outputBytes;
    const sessionTime = session.sessionTimeSec ?? 0;

    totalInputBytes += inputBytes;
    totalOutputBytes += outputBytes;
    totalBytes += bytes;
    totalSessionTimeSec += sessionTime;

    const userKey = sessionUserKey(session);
    if (userKey) uniqueCredentialIds.add(userKey);

    if (session.terminateCause) {
      const cause = session.terminateCause.trim() || 'Unknown';
      terminateMap.set(cause, (terminateMap.get(cause) ?? 0) + 1);
    }

    const bucket = bucketKey(session.startedAt, grain);
    const day = usageByDay.get(bucket) ?? {
      sessionsCount: 0,
      totalInputBytes: 0,
      totalOutputBytes: 0,
      totalBytes: 0,
      credentialIds: new Set<string>(),
    };
    day.sessionsCount += 1;
    day.totalInputBytes += inputBytes;
    day.totalOutputBytes += outputBytes;
    day.totalBytes += bytes;
    if (userKey) day.credentialIds.add(userKey);
    usageByDay.set(bucket, day);

    const stationId = session.stationId ?? session.credential?.stationId ?? null;
    if (stationId) {
      const station = stationById.get(stationId);
      const site =
        siteMap.get(stationId) ??
        ({
          stationId,
          code: station?.code ?? '—',
          name: station?.name ?? 'Unknown site',
          status: station?.status ?? 'UNKNOWN',
          location: station?.location ?? null,
          sessionsCount: 0,
          uniqueCredentials: 0,
          totalInputBytes: 0,
          totalOutputBytes: 0,
          totalBytes: 0,
          totalSessionTimeSec: 0,
        } as SessionTrafficSiteRow);
      site.sessionsCount += 1;
      site.totalInputBytes += inputBytes;
      site.totalOutputBytes += outputBytes;
      site.totalBytes += bytes;
      site.totalSessionTimeSec += sessionTime;
      siteMap.set(stationId, site);
      if (userKey) {
        const keys = siteUserKeys.get(stationId) ?? new Set<string>();
        keys.add(userKey);
        siteUserKeys.set(stationId, keys);
      }
    }

    const planId = session.credential?.planId;
    if (planId) {
      const planMeta = planById.get(planId);
      const plan =
        planMap.get(planId) ??
        ({
          planId,
          code: planMeta?.code ?? '—',
          name: planMeta?.name ?? 'Unknown plan',
          sessionsCount: 0,
          uniqueCredentials: 0,
          totalInputBytes: 0,
          totalOutputBytes: 0,
          totalBytes: 0,
          totalSessionTimeSec: 0,
        } as SessionTrafficPlanRow);
      plan.sessionsCount += 1;
      plan.totalInputBytes += inputBytes;
      plan.totalOutputBytes += outputBytes;
      plan.totalBytes += bytes;
      plan.totalSessionTimeSec += sessionTime;
      planMap.set(planId, plan);
      if (userKey) {
        const keys = planUserKeys.get(planId) ?? new Set<string>();
        keys.add(userKey);
        planUserKeys.set(planId, keys);
      }
    }
  }

  for (const site of siteMap.values()) {
    site.uniqueCredentials = siteUserKeys.get(site.stationId)?.size ?? 0;
  }
  for (const plan of planMap.values()) {
    plan.uniqueCredentials = planUserKeys.get(plan.planId)?.size ?? 0;
  }

  const active = await loadActiveSessions(prisma, orgId, filters);

  const dailyTrend = mergeTrend(
    new Map(
      [...usageByDay.entries()].map(([date, day]) => [
        date,
        {
          sessionsCount: day.sessionsCount,
          totalInputBytes: day.totalInputBytes,
          totalOutputBytes: day.totalOutputBytes,
          totalBytes: day.totalBytes,
          uniqueCredentials: day.credentialIds.size,
        },
      ])
    ),
    periodFrom,
    periodTo,
    grain
  );

  const byTerminateCause = [...terminateMap.entries()]
    .map(([cause, count]) => ({ cause, count }))
    .sort((a, b) => b.count - a.count);

  return {
    summary: finalizeSummary(
      {
        sessionsCount: sessions.length,
        uniqueCredentials: uniqueCredentialIds.size,
        totalInputBytes,
        totalOutputBytes,
        totalBytes,
        totalSessionTimeSec,
      },
      active.count,
      active.totalBytes
    ),
    previousSummary: emptySummary(),
    dailyTrend,
    trendGranularity: grain,
    bySite: [...siteMap.values()].sort(
      (a, b) => b.totalBytes - a.totalBytes || b.sessionsCount - a.sessionsCount
    ),
    byPlan: [...planMap.values()].sort(
      (a, b) => b.totalBytes - a.totalBytes || b.sessionsCount - a.sessionsCount
    ),
    byTerminateCause,
    dataSource: 'live',
  };
}

export async function buildSessionTrafficAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: TrafficFilters
): Promise<SessionTrafficPayload> {
  const [stations, plans] = await Promise.all([
    loadStationMeta(prisma, orgId, filters?.stationId),
    loadPlanMeta(prisma, orgId, filters?.planId),
  ]);
  const stationIds = stations.map((s) => s.id);
  const grain: TrendGranularity = isSingleAppDay(periodFrom, periodTo) ? 'hourly' : 'daily';

  if (stations.length === 0 && filters?.stationId) {
    const active = await loadActiveSessions(prisma, orgId, filters);
    return {
      summary: finalizeSummary(emptySummary(), active.count, active.totalBytes),
      previousSummary: emptySummary(),
      dailyTrend: mergeTrend(new Map(), periodFrom, periodTo, grain),
      trendGranularity: grain,
      bySite: [],
      byPlan: [],
      byTerminateCause: [],
      dataSource: 'aggregated',
    };
  }

  const aggregated =
    grain === 'hourly'
      ? null
      : await aggregateFromDailyStats(
          prisma,
          orgId,
          stationIds,
          stations,
          plans,
          periodFrom,
          periodTo,
          filters
        );

  const current =
    aggregated ??
    (await aggregateFromLiveSessions(
      prisma,
      orgId,
      stations,
      plans,
      periodFrom,
      periodTo,
      filters,
      grain
    ));

  const prev = previousPeriod(periodFrom, periodTo);
  const prevAggregated = await aggregateFromDailyStats(
    prisma,
    orgId,
    stationIds,
    stations,
    plans,
    prev.from,
    prev.to,
    filters
  );
  const previous =
    prevAggregated ??
    (await aggregateFromLiveSessions(prisma, orgId, stations, plans, prev.from, prev.to, filters));

  return {
    ...current,
    previousSummary: previous.summary,
  };
}
