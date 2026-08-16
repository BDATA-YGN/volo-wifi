import { Prisma, PrismaClient } from '@/generated/prisma/client';
import { normalizeMemberRoleCode } from '@/features/wifi/tenant/access-control/constants';
import {
  addAppDays,
  appDayKey as utcDayKey,
  eachAppDay,
  startOfAppDay,
} from '@/utils/app-time';
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

export type OverviewSessionHealth = {
  stationId: string;
  code: string;
  name: string;
  liveSessions: number;
  stalledSessions: number;
  todaySessions: number;
};

export type OverviewPartnerSales = {
  resellerId: string;
  code: string;
  name: string;
  orders: number;
  revenue: number;
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
  sessionHealth: OverviewSessionHealth[];
  partnerSales: OverviewPartnerSales[];
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
  consoleRole: string,
  allowedStationIds: string[] | null = null
): Promise<OverviewDashboardPayload> {
  const now = new Date();
  const today = startOfAppDay(now);
  const trendFrom = addAppDays(today, -(TREND_DAYS - 1));
  const paidTodayWhere: Prisma.SaleOrderWhereInput = {
    orgId,
    status: 'PAID',
    ...(allowedStationIds ? { stationId: { in: allowedStationIds } } : {}),
    OR: [{ soldAt: { gte: today } }, { soldAt: null, createdAt: { gte: today } }],
  };

  const [
    activeSessions,
    todayUsageAgg,
    weekSalesRows,
    weekUsageRows,
    todayOrderAgg,
    todayPayments,
    pendingApprovals,
    siteCount,
    partnerCount,
    license,
    topSiteStats,
    partnerSalesRows,
    todayUsageBySite,
    orgRoleCodes,
    stations,
  ] = await Promise.all([
    prisma.radiusSession.findMany({
      where: {
        orgId,
        status: { in: ['START', 'INTERIM'] },
        ...(allowedStationIds ? { stationId: { in: allowedStationIds } } : {}),
      },
      select: {
        id: true,
        totalBytes: true,
        stationId: true,
        startedAt: true,
        lastInterimAt: true,
      },
    }),
    prisma.dailyRadiusUsageStat.aggregate({
      where: {
        orgId,
        deletedAt: null,
        date: today,
        ...(allowedStationIds ? { stationId: { in: allowedStationIds } } : {}),
      },
      _sum: { sessionsCount: true, totalBytes: true },
    }),
    prisma.dailySalesStat.findMany({
      where: {
        orgId,
        deletedAt: null,
        date: { gte: trendFrom, lte: today },
        ...(allowedStationIds ? { stationId: { in: allowedStationIds } } : {}),
      },
      select: { date: true, ordersCount: true, revenue: true },
    }),
    prisma.dailyRadiusUsageStat.findMany({
      where: {
        orgId,
        deletedAt: null,
        date: { gte: trendFrom, lte: today },
        ...(allowedStationIds ? { stationId: { in: allowedStationIds } } : {}),
      },
      select: { date: true, sessionsCount: true, totalBytes: true },
    }),
    prisma.saleOrder.aggregate({
      where: paidTodayWhere,
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.payment.count({
      where: {
        orgId,
        paidAt: { gte: today },
        ...(allowedStationIds ? { order: { stationId: { in: allowedStationIds } } } : {}),
      },
    }),
    prisma.rptFinSettlement.count({
      where: {
        orgId,
        deletedAt: null,
        status: { in: ['DECLARED', 'STATION_ATTESTED', 'ORG_APPROVED'] },
      },
    }),
    prisma.wifiStation.count({
      where: {
        orgId,
        deletedAt: null,
        ...(allowedStationIds ? { id: { in: allowedStationIds } } : {}),
      },
    }),
    prisma.reseller.count({
      where: {
        orgId,
        deletedAt: null,
        ...(allowedStationIds
          ? { resellerStations: { some: { stationId: { in: allowedStationIds }, deletedAt: null } } }
          : {}),
      },
    }),
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
      where: {
        orgId,
        deletedAt: null,
        date: today,
        stationId: allowedStationIds ? { in: allowedStationIds } : { not: null },
      },
      _sum: { sessionsCount: true, totalBytes: true },
      orderBy: { _sum: { sessionsCount: 'desc' } },
      take: 8,
    }),
    prisma.saleOrder.groupBy({
      by: ['resellerId'],
      where: {
        ...paidTodayWhere,
        resellerId: { not: null },
      },
      _count: { id: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 8,
    }),
    prisma.dailyRadiusUsageStat.groupBy({
      by: ['stationId'],
      where: {
        orgId,
        deletedAt: null,
        date: today,
        stationId: allowedStationIds ? { in: allowedStationIds } : { not: null },
      },
      _sum: { sessionsCount: true },
    }),
    loadOrgRoleCodes(prisma, adminId, orgId, isDeveloper),
    prisma.wifiStation.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(allowedStationIds ? { id: { in: allowedStationIds } } : {}),
      },
      select: { id: true, code: true, name: true },
    }),
  ]);

  const todaySalesBySite = await prisma.saleOrder.groupBy({
    by: ['stationId'],
    where: {
      ...paidTodayWhere,
      stationId: { not: null },
    },
    _sum: { total: true },
  });

  const activeBytes = activeSessions.reduce(
    (sum, s) => sum + bigintToNumber(s.totalBytes),
    0
  );

  const activeByStation = new Map<string, number>();
  const stalledByStation = new Map<string, number>();
  let stalledSessionCount = 0;
  for (const s of activeSessions) {
    if (s.stationId) {
      activeByStation.set(s.stationId, (activeByStation.get(s.stationId) ?? 0) + 1);
    }
    if (isSessionStalled(s.startedAt, s.lastInterimAt, now)) {
      stalledSessionCount += 1;
      if (s.stationId) {
        stalledByStation.set(s.stationId, (stalledByStation.get(s.stationId) ?? 0) + 1);
      }
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
  for (const cursor of eachAppDay(trendFrom, today)) {
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
  }

  const stationMap = new Map(stations.map((s) => [s.id, s]));

  const revenueBySite = new Map(
    todaySalesBySite
      .filter((r) => r.stationId)
      .map((r) => [r.stationId as string, decimalToNumber(r._sum.total)])
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

  const todaySessionsBySite = new Map(
    todayUsageBySite
      .filter((row) => row.stationId)
      .map((row) => [row.stationId as string, row._sum.sessionsCount ?? 0])
  );

  const healthIds = new Set<string>([
    ...activeByStation.keys(),
    ...stalledByStation.keys(),
    ...todaySessionsBySite.keys(),
  ]);

  const sessionHealth: OverviewSessionHealth[] = [...healthIds]
    .map((stationId) => {
      const station = stationMap.get(stationId);
      return {
        stationId,
        code: station?.code ?? '—',
        name: station?.name ?? 'Unknown site',
        liveSessions: activeByStation.get(stationId) ?? 0,
        stalledSessions: stalledByStation.get(stationId) ?? 0,
        todaySessions: todaySessionsBySite.get(stationId) ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.stalledSessions !== a.stalledSessions) return b.stalledSessions - a.stalledSessions;
      if (b.liveSessions !== a.liveSessions) return b.liveSessions - a.liveSessions;
      return b.todaySessions - a.todaySessions;
    })
    .slice(0, 8);

  const partnerIds = partnerSalesRows
    .map((row) => row.resellerId)
    .filter((id): id is string => Boolean(id));
  const partners =
    partnerIds.length > 0
      ? await prisma.reseller.findMany({
          where: { id: { in: partnerIds }, orgId, deletedAt: null },
          select: { id: true, code: true, name: true },
        })
      : [];
  const partnerMap = new Map(partners.map((p) => [p.id, p]));
  const partnerSales: OverviewPartnerSales[] = partnerSalesRows
    .filter((row) => row.resellerId)
    .map((row) => {
      const partner = partnerMap.get(row.resellerId!);
      return {
        resellerId: row.resellerId!,
        code: partner?.code ?? '—',
        name: partner?.name ?? 'Unknown partner',
        orders: row._count.id,
        revenue: decimalToNumber(row._sum.total),
      };
    });

  const persona = resolvePersona(consoleRole, orgRoleCodes);

  return {
    summary: {
      activeSessions: activeSessions.length,
      activeBytes,
      stalledSessions: stalledSessionCount,
      todaySessions: todayUsageAgg._sum.sessionsCount ?? 0,
      todayBytes: bigintToNumber(todayUsageAgg._sum.totalBytes),
      todayOrders: todayOrderAgg._count.id,
      todayRevenue: decimalToNumber(todayOrderAgg._sum.total),
      todayPayments,
      weekRevenue: Math.round(trend7d.reduce((sum, p) => sum + p.revenue, 0) * 100) / 100,
      weekOrders: trend7d.reduce((sum, p) => sum + p.orders, 0),
      weekSessions: trend7d.reduce((sum, p) => sum + p.sessions, 0),
      pendingApprovals,
      siteCount,
      partnerCount,
      licensedSites: license?.currentActiveStationCount ?? siteCount,
      siteLimit: license?.stationLimit ?? null,
      licenseStatus: license?.status ?? null,
    },
    trend7d,
    topSites,
    sessionHealth,
    partnerSales,
    context: {
      consoleRole,
      orgRoleCodes,
      persona,
    },
    generatedAt: now.toISOString(),
  };
}
