import { Prisma, PrismaClient } from '@/generated/prisma/client';
import { STALLED_SESSION_MINUTES, type WindowHours } from './constants';

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

export type LiveOpsStatusRow = {
  status: string;
  count: number;
};

export type LiveOpsSiteRow = {
  stationId: string;
  code: string;
  name: string;
  status: string;
  activeSessions: number;
  sessionsStarted: number;
  ordersCount: number;
  revenue: number;
  totalBytes: number;
};

export type LiveOpsPartnerRow = {
  resellerId: string;
  code: string;
  name: string;
  activeSessions: number;
  sessionsStarted: number;
  ordersCount: number;
  revenue: number;
  totalBytes: number;
};

export type LiveOpsRecentSessionRow = {
  sessionId: string;
  status: string;
  userName: string | null;
  stationCode: string | null;
  stationName: string | null;
  startedAt: string;
  lastInterimAt: string | null;
  totalBytes: number;
  sessionTimeSec: number | null;
  isStalled: boolean;
};

export type LiveOpsRecentOrderRow = {
  orderId: string;
  orderNo: string;
  status: string;
  resellerCode: string | null;
  stationCode: string | null;
  total: number;
  currency: string;
  soldAt: string | null;
  createdAt: string;
};

export type LiveOpsAnalyticsPayload = {
  summary: LiveOpsSummary;
  byStatus: LiveOpsStatusRow[];
  hourlyTrend: LiveOpsHourlyPoint[];
  bySite: LiveOpsSiteRow[];
  byPartner: LiveOpsPartnerRow[];
  recentSessions: LiveOpsRecentSessionRow[];
  recentOrders: LiveOpsRecentOrderRow[];
  generatedAt: string;
  windowFrom: string;
  windowTo: string;
  windowHours: WindowHours;
};

type LiveOpsFilters = {
  stationId?: string;
  resellerId?: string;
};

function bigintToNumber(value: bigint | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : 0;
}

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
}

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function hourKey(date: Date): string {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

function resolveWindow(windowHours: WindowHours): { windowFrom: Date; windowTo: Date } {
  const windowTo = new Date();
  const windowFrom = new Date(windowTo.getTime() - windowHours * 60 * 60 * 1000);
  return { windowFrom, windowTo };
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
  windowFrom: Date,
  windowTo: Date,
  windowHours: WindowHours,
  sessionBuckets: Map<string, { count: number; bytes: number }>,
  orderBuckets: Map<string, { count: number; revenue: number }>
): LiveOpsHourlyPoint[] {
  const points: LiveOpsHourlyPoint[] = [];
  const cursor = new Date(windowFrom);
  cursor.setUTCMinutes(0, 0, 0);

  const end = new Date(windowTo);
  end.setUTCMinutes(0, 0, 0);

  while (cursor <= end) {
    const key = hourKey(cursor);
    const sessions = sessionBuckets.get(key) ?? { count: 0, bytes: 0 };
    const orders = orderBuckets.get(key) ?? { count: 0, revenue: 0 };
    points.push({
      hour: key,
      sessionsStarted: sessions.count,
      ordersCount: orders.count,
      revenue: orders.revenue,
      totalBytes: sessions.bytes,
    });
    cursor.setUTCHours(cursor.getUTCHours() + 1);
  }

  // Trim to window hours if we have extra buckets
  if (points.length > windowHours + 1) {
    return points.slice(-(windowHours + 1));
  }
  return points;
}

function statScopeFilter(filters?: LiveOpsFilters): Prisma.DailySalesStatWhereInput {
  return {
    ...(filters?.stationId ? { stationId: filters.stationId } : {}),
    ...(filters?.resellerId ? { resellerId: filters.resellerId } : {}),
  };
}

export async function buildLiveOpsAnalytics(
  prisma: PrismaClient,
  orgId: string,
  windowHours: WindowHours,
  filters?: LiveOpsFilters
): Promise<LiveOpsAnalyticsPayload> {
  const { windowFrom, windowTo } = resolveWindow(windowHours);
  const today = startOfUtcDay(new Date());
  const now = new Date();

  const sessionWhere: Prisma.RadiusSessionWhereInput = {
    orgId,
    startedAt: { gte: windowFrom, lte: windowTo },
    ...(filters?.stationId ? { stationId: filters.stationId } : {}),
    ...(filters?.resellerId
      ? { credential: { resellerId: filters.resellerId } }
      : {}),
  };

  const activeWhere: Prisma.RadiusSessionWhereInput = {
    orgId,
    status: { in: ['START', 'INTERIM'] },
    ...(filters?.stationId ? { stationId: filters.stationId } : {}),
    ...(filters?.resellerId
      ? { credential: { resellerId: filters.resellerId } }
      : {}),
  };

  const orderWhere: Prisma.SaleOrderWhereInput = {
    orgId,
    status: 'PAID',
    OR: [
      { soldAt: { gte: windowFrom, lte: windowTo } },
      { soldAt: null, createdAt: { gte: windowFrom, lte: windowTo } },
    ],
    ...(filters?.stationId ? { stationId: filters.stationId } : {}),
    ...(filters?.resellerId ? { resellerId: filters.resellerId } : {}),
  };

  const [
    activeSessions,
    windowSessions,
    recentSessions,
    windowOrders,
    recentOrders,
    paymentsCount,
    salesTodayAgg,
    usageTodayAgg,
    stations,
    resellers,
  ] = await Promise.all([
    prisma.radiusSession.findMany({
      where: activeWhere,
      select: {
        id: true,
        totalBytes: true,
        startedAt: true,
        lastInterimAt: true,
        stationId: true,
        credential: { select: { resellerId: true } },
      },
    }),
    prisma.radiusSession.findMany({
      where: sessionWhere,
      select: {
        id: true,
        status: true,
        startedAt: true,
        totalBytes: true,
        stationId: true,
        credentialId: true,
        credential: { select: { resellerId: true } },
      },
    }),
    prisma.radiusSession.findMany({
      where: sessionWhere,
      select: {
        id: true,
        status: true,
        userName: true,
        startedAt: true,
        lastInterimAt: true,
        totalBytes: true,
        sessionTimeSec: true,
        station: { select: { code: true, name: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
    }),
    prisma.saleOrder.findMany({
      where: orderWhere,
      select: {
        id: true,
        orderNo: true,
        status: true,
        total: true,
        currency: true,
        soldAt: true,
        createdAt: true,
        stationId: true,
        resellerId: true,
        station: { select: { code: true } },
        reseller: { select: { code: true } },
      },
    }),
    prisma.saleOrder.findMany({
      where: orderWhere,
      select: {
        id: true,
        orderNo: true,
        status: true,
        total: true,
        currency: true,
        soldAt: true,
        createdAt: true,
        reseller: { select: { code: true } },
        station: { select: { code: true } },
      },
      orderBy: [{ soldAt: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    }),
    prisma.payment.count({
      where: {
        orgId,
        paidAt: { gte: windowFrom, lte: windowTo },
        ...(filters?.stationId || filters?.resellerId
          ? {
              order: {
                ...(filters.stationId ? { stationId: filters.stationId } : {}),
                ...(filters.resellerId ? { resellerId: filters.resellerId } : {}),
              },
            }
          : {}),
      },
    }),
    prisma.dailySalesStat.aggregate({
      where: {
        orgId,
        deletedAt: null,
        date: today,
        ...statScopeFilter(filters),
      },
      _sum: { ordersCount: true, revenue: true },
    }),
    prisma.dailyRadiusUsageStat.aggregate({
      where: {
        orgId,
        deletedAt: null,
        date: today,
        ...statScopeFilter(filters),
      },
      _sum: { sessionsCount: true, totalBytes: true },
    }),
    prisma.wifiStation.findMany({
      where: { orgId, deletedAt: null, ...(filters?.stationId ? { id: filters.stationId } : {}) },
      select: { id: true, code: true, name: true, status: true },
      orderBy: { name: 'asc' },
    }),
    prisma.reseller.findMany({
      where: { orgId, deletedAt: null, ...(filters?.resellerId ? { id: filters.resellerId } : {}) },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const stalledSessions = activeSessions.filter((s) =>
    isSessionStalled(s.startedAt, s.lastInterimAt, now)
  ).length;

  const activeBytes = activeSessions.reduce(
    (sum, s) => sum + bigintToNumber(s.totalBytes),
    0
  );

  const credentialIds = new Set<string>();
  const statusMap = new Map<string, number>();
  const sessionHourMap = new Map<string, { count: number; bytes: number }>();
  const siteSessionMap = new Map<
    string,
    { sessionsStarted: number; totalBytes: number; activeSessions: number }
  >();
  const partnerSessionMap = new Map<
    string,
    { sessionsStarted: number; totalBytes: number; activeSessions: number }
  >();

  let sessionsStopped = 0;

  for (const session of windowSessions) {
    if (session.credentialId) credentialIds.add(session.credentialId);
    statusMap.set(session.status, (statusMap.get(session.status) ?? 0) + 1);
    if (session.status === 'STOP') sessionsStopped += 1;

    const key = hourKey(session.startedAt);
    const hour = sessionHourMap.get(key) ?? { count: 0, bytes: 0 };
    hour.count += 1;
    hour.bytes += bigintToNumber(session.totalBytes);
    sessionHourMap.set(key, hour);

    if (session.stationId) {
      const site = siteSessionMap.get(session.stationId) ?? {
        sessionsStarted: 0,
        totalBytes: 0,
        activeSessions: 0,
      };
      site.sessionsStarted += 1;
      site.totalBytes += bigintToNumber(session.totalBytes);
      siteSessionMap.set(session.stationId, site);
    }

    const resellerId = session.credential?.resellerId;
    if (resellerId) {
      const partner = partnerSessionMap.get(resellerId) ?? {
        sessionsStarted: 0,
        totalBytes: 0,
        activeSessions: 0,
      };
      partner.sessionsStarted += 1;
      partner.totalBytes += bigintToNumber(session.totalBytes);
      partnerSessionMap.set(resellerId, partner);
    }
  }

  for (const session of activeSessions) {
    if (session.stationId) {
      const site = siteSessionMap.get(session.stationId) ?? {
        sessionsStarted: 0,
        totalBytes: 0,
        activeSessions: 0,
      };
      site.activeSessions += 1;
      siteSessionMap.set(session.stationId, site);
    }
    const resellerId = session.credential?.resellerId;
    if (resellerId) {
      const partner = partnerSessionMap.get(resellerId) ?? {
        sessionsStarted: 0,
        totalBytes: 0,
        activeSessions: 0,
      };
      partner.activeSessions += 1;
      partnerSessionMap.set(resellerId, partner);
    }
  }

  const orderHourMap = new Map<string, { count: number; revenue: number }>();
  const siteOrderMap = new Map<string, { ordersCount: number; revenue: number }>();
  const partnerOrderMap = new Map<string, { ordersCount: number; revenue: number }>();
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

    if (order.stationId) {
      const site = siteOrderMap.get(order.stationId) ?? { ordersCount: 0, revenue: 0 };
      site.ordersCount += 1;
      site.revenue += amount;
      siteOrderMap.set(order.stationId, site);
    }
    if (order.resellerId) {
      const partner = partnerOrderMap.get(order.resellerId) ?? { ordersCount: 0, revenue: 0 };
      partner.ordersCount += 1;
      partner.revenue += amount;
      partnerOrderMap.set(order.resellerId, partner);
    }
  }

  const bySite: LiveOpsSiteRow[] = stations.map((station) => {
    const sessions = siteSessionMap.get(station.id) ?? {
      sessionsStarted: 0,
      totalBytes: 0,
      activeSessions: 0,
    };
    const orders = siteOrderMap.get(station.id) ?? { ordersCount: 0, revenue: 0 };
    return {
      stationId: station.id,
      code: station.code,
      name: station.name,
      status: station.status,
      activeSessions: sessions.activeSessions,
      sessionsStarted: sessions.sessionsStarted,
      ordersCount: orders.ordersCount,
      revenue: Math.round(orders.revenue * 100) / 100,
      totalBytes: sessions.totalBytes,
    };
  });

  const byPartner: LiveOpsPartnerRow[] = resellers.map((reseller) => {
    const sessions = partnerSessionMap.get(reseller.id) ?? {
      sessionsStarted: 0,
      totalBytes: 0,
      activeSessions: 0,
    };
    const orders = partnerOrderMap.get(reseller.id) ?? { ordersCount: 0, revenue: 0 };
    return {
      resellerId: reseller.id,
      code: reseller.code,
      name: reseller.name,
      activeSessions: sessions.activeSessions,
      sessionsStarted: sessions.sessionsStarted,
      ordersCount: orders.ordersCount,
      revenue: Math.round(orders.revenue * 100) / 100,
      totalBytes: sessions.totalBytes,
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
    byStatus: [...statusMap.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    hourlyTrend: buildHourlySeries(
      windowFrom,
      windowTo,
      windowHours,
      sessionHourMap,
      orderHourMap
    ),
    bySite: bySite.sort(
      (a, b) => b.activeSessions - a.activeSessions || b.sessionsStarted - a.sessionsStarted
    ),
    byPartner: byPartner.sort(
      (a, b) => b.activeSessions - a.activeSessions || b.revenue - a.revenue
    ),
    recentSessions: recentSessions.map((s) => ({
      sessionId: s.id,
      status: s.status,
      userName: s.userName,
      stationCode: s.station?.code ?? null,
      stationName: s.station?.name ?? null,
      startedAt: s.startedAt.toISOString(),
      lastInterimAt: s.lastInterimAt?.toISOString() ?? null,
      totalBytes: bigintToNumber(s.totalBytes),
      sessionTimeSec: s.sessionTimeSec,
      isStalled: isSessionStalled(s.startedAt, s.lastInterimAt, now),
    })),
    recentOrders: recentOrders.map((o) => ({
      orderId: o.id,
      orderNo: o.orderNo,
      status: o.status,
      resellerCode: o.reseller?.code ?? null,
      stationCode: o.station?.code ?? null,
      total: decimalToNumber(o.total),
      currency: o.currency,
      soldAt: o.soldAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
    })),
    generatedAt: now.toISOString(),
    windowFrom: windowFrom.toISOString(),
    windowTo: windowTo.toISOString(),
    windowHours,
  };
}
