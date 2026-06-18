import { Prisma, PrismaClient } from '@/generated/prisma/client';
import { normalizeMemberRoleCode } from '@/features/wifi/tenant/access-control/constants';
import { STALLED_SESSION_MINUTES, TREND_DAYS } from './constants';

export type OverviewSummary = {
  activeSessions: number;
  activeBytes: number;
  stalledSessions: number;
  todaySessions: number;
  todayBytes: number;
  todayOrders: number;
  todayRevenue: number;
  todayPayments: number;
  weekRevenue: number;
  weekOrders: number;
  weekSessions: number;
  pendingApprovals: number;
  siteCount: number;
  partnerCount: number;
  licensedSites: number;
  siteLimit: number | null;
  licenseStatus: string | null;
};

export type OverviewTrendPoint = {
  date: string;
  revenue: number;
  orders: number;
  sessions: number;
  totalBytes: number;
};

export type OverviewSitePulse = {
  stationId: string;
  code: string;
  name: string;
  activeSessions: number;
  todaySessions: number;
  todayRevenue: number;
  todayBytes: number;
};

export type OverviewRecentOrder = {
  orderId: string;
  orderNo: string;
  stationCode: string | null;
  resellerCode: string | null;
  total: number;
  currency: string;
  soldAt: string | null;
};

export type OverviewRecentSession = {
  sessionId: string;
  userName: string | null;
  stationCode: string | null;
  status: string;
  startedAt: string;
  totalBytes: number;
  isStalled: boolean;
};

export type OverviewContext = {
  consoleRole: string;
  orgRoleCodes: string[];
  persona: string;
};

export type OverviewDashboardPayload = {
  summary: OverviewSummary;
  trend7d: OverviewTrendPoint[];
  topSites: OverviewSitePulse[];
  recentOrders: OverviewRecentOrder[];
  recentSessions: OverviewRecentSession[];
  context: OverviewContext;
  generatedAt: string;
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

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isSessionStalled(
  startedAt: Date,
  lastInterimAt: Date | null,
  now: Date = new Date()
): boolean {
  const lastSeen = lastInterimAt ?? startedAt;
  return now.getTime() - lastSeen.getTime() > STALLED_SESSION_MINUTES * 60 * 1000;
}

function resolvePersona(consoleRole: string, orgRoleCodes: string[]): string {
  const priority = [
    'ORG_ADMIN',
    'ORG_FINANCE',
    'STATION_OPS',
    'PARTNER',
    'ORG_VIEWER',
    // Legacy membership codes
    'ORG_OWNER',
    'STATION_MANAGER',
    'STATION_OPERATOR',
    'RESELLER_MANAGER',
    'FINANCE_CLERK',
  ];
  for (const code of priority) {
    if (orgRoleCodes.includes(code)) return String(normalizeMemberRoleCode(code));
  }
  if (consoleRole.toLowerCase() === 'developer') return 'DEVELOPER';
  if (consoleRole.toLowerCase() === 'admin') return 'PLATFORM_ADMIN';
  return orgRoleCodes[0] ?? consoleRole;
}

export async function loadOrgRoleCodes(
  prisma: PrismaClient,
  adminId: string,
  orgId: string,
  isDeveloper: boolean
): Promise<string[]> {
  if (isDeveloper) return ['ORG_ADMIN', 'DEVELOPER'];

  const owned = await prisma.org.findFirst({
    where: { id: orgId, adminId, deletedAt: null },
    select: { id: true },
  });
  if (owned) return ['ORG_ADMIN'];

  const member = await prisma.orgMember.findFirst({
    where: { orgId, adminId, deletedAt: null, status: 'ACTIVE' },
    select: {
      roles: {
        where: { isActive: true, deletedAt: null },
        select: { roleCode: true },
      },
    },
  });

  const codes = member?.roles.map((r) => String(normalizeMemberRoleCode(r.roleCode))) ?? [];
  return [...new Set(codes)];
}

export async function buildOverviewDashboard(
  prisma: PrismaClient,
  orgId: string,
  adminId: string,
  isDeveloper: boolean,
  consoleRole: string
): Promise<OverviewDashboardPayload> {
  const now = new Date();
  const today = startOfUtcDay(now);
  const trendFrom = new Date(today);
  trendFrom.setUTCDate(trendFrom.getUTCDate() - (TREND_DAYS - 1));

  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    activeSessions,
    stalledSessions,
    todayUsageAgg,
    weekSalesRows,
    weekUsageRows,
    todayOrders,
    weekOrderAgg,
    todayPayments,
    pendingApprovals,
    siteCount,
    partnerCount,
    license,
    topSiteStats,
    recentOrders,
    recentSessions,
    orgRoleCodes,
    stations,
  ] = await Promise.all([
    prisma.radiusSession.findMany({
      where: { orgId, status: { in: ['START', 'INTERIM'] } },
      select: { id: true, totalBytes: true, stationId: true },
    }),
    prisma.radiusSession.findMany({
      where: { orgId, status: { in: ['START', 'INTERIM'] } },
      select: { startedAt: true, lastInterimAt: true },
    }),
    prisma.dailyRadiusUsageStat.aggregate({
      where: { orgId, deletedAt: null, date: today },
      _sum: { sessionsCount: true, totalBytes: true },
    }),
    prisma.dailySalesStat.findMany({
      where: { orgId, deletedAt: null, date: { gte: trendFrom, lte: today } },
      select: { date: true, ordersCount: true, revenue: true },
    }),
    prisma.dailyRadiusUsageStat.findMany({
      where: { orgId, deletedAt: null, date: { gte: trendFrom, lte: today } },
      select: { date: true, sessionsCount: true, totalBytes: true },
    }),
    prisma.saleOrder.count({
      where: {
        orgId,
        status: 'PAID',
        OR: [
          { soldAt: { gte: today } },
          { soldAt: null, createdAt: { gte: today } },
        ],
      },
    }),
    prisma.saleOrder.aggregate({
      where: {
        orgId,
        status: 'PAID',
        OR: [
          { soldAt: { gte: trendFrom } },
          { soldAt: null, createdAt: { gte: trendFrom } },
        ],
      },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.payment.count({
      where: { orgId, paidAt: { gte: today } },
    }),
    prisma.rptFinSettlement.count({
      where: {
        orgId,
        deletedAt: null,
        status: { in: ['DECLARED', 'STATION_ATTESTED', 'ORG_APPROVED'] },
      },
    }),
    prisma.wifiStation.count({ where: { orgId, deletedAt: null } }),
    prisma.reseller.count({ where: { orgId, deletedAt: null } }),
    prisma.orgLicense.findUnique({
      where: { orgId },
      select: {
        status: true,
        stationLimit: true,
        currentActiveStationCount: true,
      },
    }),
    prisma.dailyRadiusUsageStat.groupBy({
      by: ['stationId'],
      where: { orgId, deletedAt: null, date: today, stationId: { not: null } },
      _sum: { sessionsCount: true, totalBytes: true },
      orderBy: { _sum: { sessionsCount: 'desc' } },
      take: 8,
    }),
    prisma.saleOrder.findMany({
      where: {
        orgId,
        status: 'PAID',
        OR: [
          { soldAt: { gte: windowStart } },
          { soldAt: null, createdAt: { gte: windowStart } },
        ],
      },
      select: {
        id: true,
        orderNo: true,
        total: true,
        currency: true,
        soldAt: true,
        station: { select: { code: true } },
        reseller: { select: { code: true } },
      },
      orderBy: [{ soldAt: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    }),
    prisma.radiusSession.findMany({
      where: { orgId, startedAt: { gte: windowStart } },
      select: {
        id: true,
        userName: true,
        status: true,
        startedAt: true,
        lastInterimAt: true,
        totalBytes: true,
        station: { select: { code: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 8,
    }),
    loadOrgRoleCodes(prisma, adminId, orgId, isDeveloper),
    prisma.wifiStation.findMany({
      where: { orgId, deletedAt: null },
      select: { id: true, code: true, name: true },
    }),
  ]);

  const todayRevenueAgg = await prisma.dailySalesStat.aggregate({
    where: { orgId, deletedAt: null, date: today },
    _sum: { revenue: true, ordersCount: true },
  });

  const activeBytes = activeSessions.reduce(
    (sum, s) => sum + bigintToNumber(s.totalBytes),
    0
  );

  const activeByStation = new Map<string, number>();
  for (const s of activeSessions) {
    if (s.stationId) {
      activeByStation.set(s.stationId, (activeByStation.get(s.stationId) ?? 0) + 1);
    }
  }

  const salesByDay = new Map<string, { revenue: number; orders: number }>();
  for (const row of weekSalesRows) {
    const key = utcDayKey(row.date);
    const day = salesByDay.get(key) ?? { revenue: 0, orders: 0 };
    day.revenue += decimalToNumber(row.revenue);
    day.orders += row.ordersCount;
    salesByDay.set(key, day);
  }

  const usageByDay = new Map<string, { sessions: number; totalBytes: number }>();
  for (const row of weekUsageRows) {
    const key = utcDayKey(row.date);
    const day = usageByDay.get(key) ?? { sessions: 0, totalBytes: 0 };
    day.sessions += row.sessionsCount;
    day.totalBytes += bigintToNumber(row.totalBytes);
    usageByDay.set(key, day);
  }

  const trend7d: OverviewTrendPoint[] = [];
  const cursor = new Date(trendFrom);
  while (cursor <= today) {
    const key = utcDayKey(cursor);
    const sales = salesByDay.get(key) ?? { revenue: 0, orders: 0 };
    const usage = usageByDay.get(key) ?? { sessions: 0, totalBytes: 0 };
    trend7d.push({
      date: key,
      revenue: Math.round(sales.revenue * 100) / 100,
      orders: sales.orders,
      sessions: usage.sessions,
      totalBytes: usage.totalBytes,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const stationMap = new Map(stations.map((s) => [s.id, s]));
  const topSiteIds = topSiteStats
    .map((r) => r.stationId)
    .filter((id): id is string => Boolean(id));

  const todayRevenueBySite = await prisma.dailySalesStat.groupBy({
    by: ['stationId'],
    where: {
      orgId,
      deletedAt: null,
      date: today,
      stationId: { in: topSiteIds.length > 0 ? topSiteIds : ['__none__'] },
    },
    _sum: { revenue: true },
  });

  const revenueBySite = new Map(
    todayRevenueBySite.map((r) => [r.stationId, decimalToNumber(r._sum.revenue)])
  );

  const topSites: OverviewSitePulse[] = topSiteStats
    .filter((row) => row.stationId)
    .map((row) => {
      const station = stationMap.get(row.stationId!);
      return {
        stationId: row.stationId!,
        code: station?.code ?? '—',
        name: station?.name ?? 'Unknown site',
        activeSessions: activeByStation.get(row.stationId!) ?? 0,
        todaySessions: row._sum.sessionsCount ?? 0,
        todayRevenue: revenueBySite.get(row.stationId!) ?? 0,
        todayBytes: bigintToNumber(row._sum.totalBytes),
      };
    });

  const persona = resolvePersona(consoleRole, orgRoleCodes);

  return {
    summary: {
      activeSessions: activeSessions.length,
      activeBytes,
      stalledSessions: stalledSessions.filter((s) =>
        isSessionStalled(s.startedAt, s.lastInterimAt, now)
      ).length,
      todaySessions: todayUsageAgg._sum.sessionsCount ?? 0,
      todayBytes: bigintToNumber(todayUsageAgg._sum.totalBytes),
      todayOrders: todayOrders,
      todayRevenue: decimalToNumber(todayRevenueAgg._sum.revenue),
      todayPayments,
      weekRevenue: decimalToNumber(weekOrderAgg._sum.total),
      weekOrders: weekOrderAgg._count.id,
      weekSessions: weekUsageRows.reduce((sum, r) => sum + r.sessionsCount, 0),
      pendingApprovals,
      siteCount,
      partnerCount,
      licensedSites: license?.currentActiveStationCount ?? siteCount,
      siteLimit: license?.stationLimit ?? null,
      licenseStatus: license?.status ?? null,
    },
    trend7d,
    topSites,
    recentOrders: recentOrders.map((o) => ({
      orderId: o.id,
      orderNo: o.orderNo,
      stationCode: o.station?.code ?? null,
      resellerCode: o.reseller?.code ?? null,
      total: decimalToNumber(o.total),
      currency: o.currency,
      soldAt: o.soldAt?.toISOString() ?? null,
    })),
    recentSessions: recentSessions.map((s) => ({
      sessionId: s.id,
      userName: s.userName,
      stationCode: s.station?.code ?? null,
      status: s.status,
      startedAt: s.startedAt.toISOString(),
      totalBytes: bigintToNumber(s.totalBytes),
      isStalled: isSessionStalled(s.startedAt, s.lastInterimAt, now),
    })),
    context: {
      consoleRole,
      orgRoleCodes,
      persona,
    },
    generatedAt: now.toISOString(),
  };
}
