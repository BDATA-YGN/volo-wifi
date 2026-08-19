import { Prisma, PrismaClient } from '@/generated/prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { APP_TIMEZONE, endOfAppDay, startOfAppDay } from '@/utils/app-time';
import { STALLED_SESSION_MINUTES } from './constants';

dayjs.extend(utc);
dayjs.extend(timezone);

function appTz(date: Date = new Date()) {
  return dayjs(date).tz(process.env.TZ || APP_TIMEZONE);
}

export type LiveOpsSummary = {
  activeSessions: number;
  activeBytes: number;
  stalledSessions: number;
  sessionsStarted: number;
  sessionsStopped: number;
  ordersCount: number;
  revenue: number;
  paymentsCount: number;
  uniqueCredentials: number;
  todayOrders: number;
  todayRevenue: number;
  todaySessions: number;
  todayBytes: number;
};

export type LiveOpsHourlyPoint = {
  hour: string;
  sessionsStarted: number;
  ordersCount: number;
  revenue: number;
  totalBytes: number;
};

export type LiveOpsSiteRow = {
  stationId: string;
  code: string;
  name: string;
  status: string;
  radiusStart: number;
  radiusInterim: number;
  radiusStop: number;
  totalBytes: number;
  tokenStatus: Array<{ status: string; count: number }>;
};

export type LiveOpsAnalyticsPayload = {
  summary: LiveOpsSummary;
  hourlyTrend: LiveOpsHourlyPoint[];
  bySite: LiveOpsSiteRow[];
  generatedAt: string;
  windowFrom: string;
  windowTo: string;
  date: string;
};

type LiveOpsFilters = {
  stationId?: string;
  allowedStationIds?: string[];
  planId?: string;
};

function bigintToNumber(value: bigint | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : 0;
}

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
}

function hourKey(date: Date): string {
  return appTz(date).startOf('hour').toISOString();
}

function resolveWindow(dayStart: Date): { windowFrom: Date; windowTo: Date; isToday: boolean } {
  const windowFrom = startOfAppDay(dayStart);
  const todayStart = startOfAppDay(new Date());
  const isToday = windowFrom.getTime() === todayStart.getTime();
  const windowTo = isToday ? new Date() : endOfAppDay(windowFrom);
  return { windowFrom, windowTo, isToday };
}

function stationScope(filters?: LiveOpsFilters): { stationId?: string | { in: string[] } } {
  if (filters?.stationId) return { stationId: filters.stationId };
  if (filters?.allowedStationIds) return { stationId: { in: filters.allowedStationIds } };
  return {};
}

function planCredentialFilter(filters?: LiveOpsFilters): { credential?: { planId: string } } {
  return filters?.planId ? { credential: { planId: filters.planId } } : {};
}

function isSessionStalled(
  startedAt: Date,
  lastInterimAt: Date | null,
  now: Date = new Date()
): boolean {
  const lastSeen = lastInterimAt ?? startedAt;
  return now.getTime() - lastSeen.getTime() > STALLED_SESSION_MINUTES * 60 * 1000;
}

function buildHourlySeries(
  dayStart: Date,
  sessionBuckets: Map<string, { count: number; bytes: number }>,
  orderBuckets: Map<string, { count: number; revenue: number }>
): LiveOpsHourlyPoint[] {
  const points: LiveOpsHourlyPoint[] = [];
  let cursor = appTz(dayStart).startOf('day');

  for (let i = 0; i < 24; i += 1) {
    const key = cursor.toISOString();
    const sessions = sessionBuckets.get(key) ?? { count: 0, bytes: 0 };
    const orders = orderBuckets.get(key) ?? { count: 0, revenue: 0 };
    points.push({
      hour: key,
      sessionsStarted: sessions.count,
      ordersCount: orders.count,
      revenue: orders.revenue,
      totalBytes: sessions.bytes,
    });
    cursor = cursor.add(1, 'hour');
  }

  return points;
}

function statScopeFilter(filters?: LiveOpsFilters): Prisma.DailySalesStatWhereInput {
  return {
    ...stationScope(filters),
    ...(filters?.planId ? { planId: filters.planId } : {}),
  };
}

function credentialStationWhere(
  orgId: string,
  filters?: LiveOpsFilters
): Prisma.CredentialWhereInput {
  return {
    orgId,
    deletedAt: null,
    ...(filters?.planId ? { planId: filters.planId } : {}),
    ...(filters?.stationId
      ? { stationId: filters.stationId }
      : filters?.allowedStationIds
        ? { stationId: { in: filters.allowedStationIds } }
        : { stationId: { not: null } }),
  };
}

async function loadTokenEventsByStation(
  prisma: PrismaClient,
  orgId: string,
  windowFrom: Date,
  windowTo: Date,
  filters?: LiveOpsFilters
): Promise<Map<string, Array<{ status: string; count: number }>>> {
  const base = credentialStationWhere(orgId, filters);
  const inDay = { gte: windowFrom, lte: windowTo };
  const TOKEN_STATUS_ORDER = ['SOLD', 'ACTIVATED', 'PAUSED', 'CONSUMED', 'EXPIRED', 'REVOKED'];

  const [sold, activated, paused, consumed, expired, revoked] = await Promise.all([
    prisma.credential.groupBy({
      by: ['stationId'],
      where: { ...base, soldAt: inDay },
      _count: { _all: true },
    }),
    prisma.credential.groupBy({
      by: ['stationId'],
      where: { ...base, activatedAt: inDay },
      _count: { _all: true },
    }),
    prisma.credential.groupBy({
      by: ['stationId'],
      where: { ...base, status: 'PAUSED', updatedAt: inDay },
      _count: { _all: true },
    }),
    prisma.credential.groupBy({
      by: ['stationId'],
      where: { ...base, status: 'CONSUMED', updatedAt: inDay },
      _count: { _all: true },
    }),
    prisma.credential.groupBy({
      by: ['stationId'],
      where: { ...base, expiresAt: inDay },
      _count: { _all: true },
    }),
    prisma.credential.groupBy({
      by: ['stationId'],
      where: { ...base, revokedAt: inDay },
      _count: { _all: true },
    }),
  ]);

  const map = new Map<string, Array<{ status: string; count: number }>>();
  const add = (
    rows: Array<{ stationId: string | null; _count: { _all: number } }>,
    status: string
  ) => {
    for (const row of rows) {
      if (!row.stationId || row._count._all <= 0) continue;
      const list = map.get(row.stationId) ?? [];
      list.push({ status, count: row._count._all });
      map.set(row.stationId, list);
    }
  };

  add(sold, 'SOLD');
  add(activated, 'ACTIVATED');
  add(paused, 'PAUSED');
  add(consumed, 'CONSUMED');
  add(expired, 'EXPIRED');
  add(revoked, 'REVOKED');

  for (const list of map.values()) {
    list.sort(
      (a, b) => TOKEN_STATUS_ORDER.indexOf(a.status) - TOKEN_STATUS_ORDER.indexOf(b.status)
    );
  }
  return map;
}

export async function buildLiveOpsAnalytics(
  prisma: PrismaClient,
  orgId: string,
  dayStart: Date,
  filters?: LiveOpsFilters
): Promise<LiveOpsAnalyticsPayload> {
  const { windowFrom, windowTo, isToday } = resolveWindow(dayStart);
  const now = new Date();
  const scope = stationScope(filters);
  const planCred = planCredentialFilter(filters);

  const sessionWhere: Prisma.RadiusSessionWhereInput = {
    orgId,
    startedAt: { gte: windowFrom, lte: windowTo },
    ...scope,
    ...planCred,
  };

  const activeWhere: Prisma.RadiusSessionWhereInput = {
    orgId,
    status: { in: ['START', 'INTERIM'] },
    ...scope,
    ...planCred,
  };

  const orderWhere: Prisma.SaleOrderWhereInput = {
    orgId,
    status: 'PAID',
    OR: [
      { soldAt: { gte: windowFrom, lte: windowTo } },
      { soldAt: null, createdAt: { gte: windowFrom, lte: windowTo } },
    ],
    ...scope,
    ...(filters?.planId ? { items: { some: { planId: filters.planId } } } : {}),
  };

  const [
    activeSessions,
    windowSessions,
    windowOrders,
    paymentsCount,
    salesTodayAgg,
    usageTodayAgg,
    stations,
    tokenStatusMap,
  ] = await Promise.all([
    isToday
      ? prisma.radiusSession.findMany({
          where: activeWhere,
          select: {
            id: true,
            totalBytes: true,
            startedAt: true,
            lastInterimAt: true,
            stationId: true,
          },
        })
      : Promise.resolve([]),
    prisma.radiusSession.findMany({
      where: sessionWhere,
      select: {
        id: true,
        status: true,
        startedAt: true,
        totalBytes: true,
        stationId: true,
        credentialId: true,
      },
    }),
    prisma.saleOrder.findMany({
      where: orderWhere,
      select: {
        id: true,
        total: true,
        soldAt: true,
        createdAt: true,
      },
    }),
    prisma.payment.count({
      where: {
        orgId,
        paidAt: { gte: windowFrom, lte: windowTo },
        ...(filters?.stationId || filters?.allowedStationIds || filters?.planId
          ? {
              order: {
                ...scope,
                ...(filters.planId ? { items: { some: { planId: filters.planId } } } : {}),
              },
            }
          : {}),
      },
    }),
    prisma.dailySalesStat.aggregate({
      where: {
        orgId,
        deletedAt: null,
        date: windowFrom,
        ...statScopeFilter(filters),
      },
      _sum: { ordersCount: true, revenue: true },
    }),
    prisma.dailyRadiusUsageStat.aggregate({
      where: {
        orgId,
        deletedAt: null,
        date: windowFrom,
        ...statScopeFilter(filters),
      },
      _sum: { sessionsCount: true, totalBytes: true },
    }),
    prisma.wifiStation.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(filters?.stationId
          ? { id: filters.stationId }
          : filters?.allowedStationIds
            ? { id: { in: filters.allowedStationIds } }
            : {}),
      },
      select: { id: true, code: true, name: true, status: true },
      orderBy: { name: 'asc' },
    }),
    loadTokenEventsByStation(prisma, orgId, windowFrom, windowTo, filters),
  ]);

  const stalledSessions = activeSessions.filter((s) =>
    isSessionStalled(s.startedAt, s.lastInterimAt, now)
  ).length;

  const activeBytes = activeSessions.reduce(
    (sum, s) => sum + bigintToNumber(s.totalBytes),
    0
  );

  const credentialIds = new Set<string>();
  const sessionHourMap = new Map<string, { count: number; bytes: number }>();
  const siteSessionMap = new Map<
    string,
    { radiusStart: number; radiusInterim: number; radiusStop: number; totalBytes: number }
  >();

  let sessionsStopped = 0;

  for (const session of windowSessions) {
    if (session.credentialId) credentialIds.add(session.credentialId);
    if (session.status === 'STOP') sessionsStopped += 1;

    const key = hourKey(session.startedAt);
    const hour = sessionHourMap.get(key) ?? { count: 0, bytes: 0 };
    hour.count += 1;
    hour.bytes += bigintToNumber(session.totalBytes);
    sessionHourMap.set(key, hour);

    if (!session.stationId) continue;
    const site = siteSessionMap.get(session.stationId) ?? {
      radiusStart: 0,
      radiusInterim: 0,
      radiusStop: 0,
      totalBytes: 0,
    };
    if (session.status === 'START') site.radiusStart += 1;
    else if (session.status === 'INTERIM') site.radiusInterim += 1;
    else if (session.status === 'STOP') site.radiusStop += 1;
    site.totalBytes += bigintToNumber(session.totalBytes);
    siteSessionMap.set(session.stationId, site);
  }

  const orderHourMap = new Map<string, { count: number; revenue: number }>();
  let revenue = 0;

  for (const order of windowOrders) {
    const amount = decimalToNumber(order.total);
    revenue += amount;
    const at = order.soldAt ?? order.createdAt;
    const key = hourKey(at);
    const hour = orderHourMap.get(key) ?? { count: 0, revenue: 0 };
    hour.count += 1;
    hour.revenue += amount;
    orderHourMap.set(key, hour);
  }

  const bySite: LiveOpsSiteRow[] = stations.map((station) => {
    const sessions = siteSessionMap.get(station.id) ?? {
      radiusStart: 0,
      radiusInterim: 0,
      radiusStop: 0,
      totalBytes: 0,
    };
    return {
      stationId: station.id,
      code: station.code,
      name: station.name,
      status: station.status,
      radiusStart: sessions.radiusStart,
      radiusInterim: sessions.radiusInterim,
      radiusStop: sessions.radiusStop,
      totalBytes: sessions.totalBytes,
      tokenStatus: tokenStatusMap.get(station.id) ?? [],
    };
  });

  return {
    summary: {
      activeSessions: activeSessions.length,
      activeBytes,
      stalledSessions,
      sessionsStarted: windowSessions.length,
      sessionsStopped,
      ordersCount: windowOrders.length,
      revenue: Math.round(revenue * 100) / 100,
      paymentsCount,
      uniqueCredentials: credentialIds.size,
      todayOrders: salesTodayAgg._sum.ordersCount ?? 0,
      todayRevenue: decimalToNumber(salesTodayAgg._sum.revenue),
      todaySessions: usageTodayAgg._sum.sessionsCount ?? 0,
      todayBytes: bigintToNumber(usageTodayAgg._sum.totalBytes),
    },
    hourlyTrend: buildHourlySeries(windowFrom, sessionHourMap, orderHourMap),
    bySite: bySite.sort(
      (a, b) =>
        b.radiusStart + b.radiusInterim - (a.radiusStart + a.radiusInterim) ||
        b.totalBytes - a.totalBytes
    ),
    generatedAt: now.toISOString(),
    windowFrom: windowFrom.toISOString(),
    windowTo: windowTo.toISOString(),
    date: appTz(windowFrom).format('YYYY-MM-DD'),
  };
}
