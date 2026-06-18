import { Prisma, PrismaClient } from '@/generated/prisma/client';

const ACTIVE_STATUSES = ['ACTIVE', 'ACTIVATED', 'IN_USE', 'PAUSED', 'SOLD'] as const;
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

export type CredentialStatusRow = {
  status: string;
  count: number;
};

export type CredentialTypeRow = {
  type: string;
  inventoryCount: number;
  activeCount: number;
  soldInPeriod: number;
};

export type CredentialPlanRow = {
  planId: string;
  code: string;
  name: string;
  inventoryCount: number;
  activeCount: number;
  soldInPeriod: number;
  expiredInPeriod: number;
};

export type CredentialAnalyticsPayload = {
  summary: CredentialAnalyticsSummary;
  previousSummary: CredentialAnalyticsSummary;
  dailyTrend: CredentialDailyPoint[];
  byStatus: CredentialStatusRow[];
  byType: CredentialTypeRow[];
  byPlan: CredentialPlanRow[];
};

type CredentialFilters = {
  planId?: string;
  type?: string;
};

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
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

function mergeDailyTrend(
  soldByDay: Map<string, number>,
  activatedByDay: Map<string, number>,
  expiredByDay: Map<string, number>,
  revokedByDay: Map<string, number>,
  archivedByDay: Map<string, number>,
  periodFrom: Date,
  periodTo: Date
): CredentialDailyPoint[] {
  const points: CredentialDailyPoint[] = [];
  const cursor = new Date(periodFrom);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(periodTo);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = utcDayKey(cursor);
    points.push({
      date: key,
      sold: soldByDay.get(key) ?? 0,
      activated: activatedByDay.get(key) ?? 0,
      expired: expiredByDay.get(key) ?? 0,
      revoked: revokedByDay.get(key) ?? 0,
      archived: archivedByDay.get(key) ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return points;
}

function incrementDay(map: Map<string, number>, date: Date | null | undefined) {
  if (!date) return;
  const key = utcDayKey(date);
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function resolvePeriodFromPreset(
  preset: string,
  periodTo: Date = new Date()
): { periodFrom: Date; periodTo: Date } {
  const end = new Date(periodTo);
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  return { periodFrom: start, periodTo: end };
}

export function previousPeriod(periodFrom: Date, periodTo: Date): { from: Date; to: Date } {
  const ms = periodTo.getTime() - periodFrom.getTime();
  const to = new Date(periodFrom.getTime() - 1);
  const from = new Date(to.getTime() - ms);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

function baseCredentialWhere(orgId: string, filters?: CredentialFilters): Prisma.CredentialWhereInput {
  return {
    orgId,
    deletedAt: null,
    ...(filters?.planId ? { planId: filters.planId } : {}),
    ...(filters?.type ? { type: filters.type as 'VOUCHER_TOKEN' | 'USER_PASSWORD' } : {}),
  };
}

async function buildPeriodMetrics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: CredentialFilters
): Promise<{
  summary: CredentialAnalyticsSummary;
  dailyTrend: CredentialDailyPoint[];
  planSoldMap: Map<string, { soldInPeriod: number; expiredInPeriod: number }>;
  typeSoldMap: Map<string, number>;
}> {
  const where = baseCredentialWhere(orgId, filters);

  const [soldRows, activatedRows, expiredRows, revokedRows, consumedRows, archivedRows] =
    await Promise.all([
      prisma.credential.findMany({
        where: { ...where, soldAt: { gte: periodFrom, lte: periodTo } },
        select: { soldAt: true, planId: true, type: true, expiresAt: true },
      }),
      prisma.credential.findMany({
        where: { ...where, activatedAt: { gte: periodFrom, lte: periodTo } },
        select: { activatedAt: true },
      }),
      prisma.credential.findMany({
        where: { ...where, expiresAt: { gte: periodFrom, lte: periodTo } },
        select: { expiresAt: true, planId: true },
      }),
      prisma.credential.findMany({
        where: { ...where, revokedAt: { gte: periodFrom, lte: periodTo } },
        select: { revokedAt: true },
      }),
      prisma.credential.findMany({
        where: {
          ...where,
          status: 'CONSUMED',
          updatedAt: { gte: periodFrom, lte: periodTo },
        },
        select: { updatedAt: true },
      }),
      prisma.credentialArchive.findMany({
        where: {
          orgId,
          archivedAt: { gte: periodFrom, lte: periodTo },
          ...(filters?.planId ? { planId: filters.planId } : {}),
          ...(filters?.type ? { type: filters.type as 'VOUCHER_TOKEN' | 'USER_PASSWORD' } : {}),
        },
        select: { archivedAt: true },
      }),
    ]);

  const soldByDay = new Map<string, number>();
  const activatedByDay = new Map<string, number>();
  const expiredByDay = new Map<string, number>();
  const revokedByDay = new Map<string, number>();
  const archivedByDay = new Map<string, number>();
  const planSoldMap = new Map<string, { soldInPeriod: number; expiredInPeriod: number }>();
  const typeSoldMap = new Map<string, number>();

  for (const row of soldRows) {
    incrementDay(soldByDay, row.soldAt);
    const plan = planSoldMap.get(row.planId) ?? { soldInPeriod: 0, expiredInPeriod: 0 };
    plan.soldInPeriod += 1;
    planSoldMap.set(row.planId, plan);
    typeSoldMap.set(row.type, (typeSoldMap.get(row.type) ?? 0) + 1);
  }

  for (const row of activatedRows) {
    incrementDay(activatedByDay, row.activatedAt);
  }

  for (const row of expiredRows) {
    incrementDay(expiredByDay, row.expiresAt);
    const plan = planSoldMap.get(row.planId) ?? { soldInPeriod: 0, expiredInPeriod: 0 };
    plan.expiredInPeriod += 1;
    planSoldMap.set(row.planId, plan);
  }

  for (const row of revokedRows) {
    incrementDay(revokedByDay, row.revokedAt);
  }

  for (const row of archivedRows) {
    incrementDay(archivedByDay, row.archivedAt);
  }

  const summary = emptySummary();
  summary.soldInPeriod = soldRows.length;
  summary.activatedInPeriod = activatedRows.length;
  summary.expiredInPeriod = expiredRows.length;
  summary.revokedInPeriod = revokedRows.length;
  summary.consumedInPeriod = consumedRows.length;
  summary.archivedInPeriod = archivedRows.length;

  return {
    summary,
    dailyTrend: mergeDailyTrend(
      soldByDay,
      activatedByDay,
      expiredByDay,
      revokedByDay,
      archivedByDay,
      periodFrom,
      periodTo
    ),
    planSoldMap,
    typeSoldMap,
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

  const inventory = await prisma.credential.findMany({
    where,
    select: {
      status: true,
      type: true,
      planId: true,
      plan: { select: { code: true, name: true } },
    },
  });

  const byStatusMap = new Map<string, number>();
  const byTypeMap = new Map<string, { inventoryCount: number; activeCount: number }>();
  const byPlanMap = new Map<
    string,
    { code: string; name: string; inventoryCount: number; activeCount: number }
  >();

  let activeCount = 0;
  let terminalCount = 0;

  for (const row of inventory) {
    byStatusMap.set(row.status, (byStatusMap.get(row.status) ?? 0) + 1);

    if ((ACTIVE_STATUSES as readonly string[]).includes(row.status)) activeCount += 1;
    if ((TERMINAL_STATUSES as readonly string[]).includes(row.status)) terminalCount += 1;

    const typeRow = byTypeMap.get(row.type) ?? { inventoryCount: 0, activeCount: 0 };
    typeRow.inventoryCount += 1;
    if ((ACTIVE_STATUSES as readonly string[]).includes(row.status)) typeRow.activeCount += 1;
    byTypeMap.set(row.type, typeRow);

    const planRow =
      byPlanMap.get(row.planId) ??
      ({ code: row.plan.code, name: row.plan.name, inventoryCount: 0, activeCount: 0 } as const);
    const planAgg = { ...planRow };
    planAgg.inventoryCount += 1;
    if ((ACTIVE_STATUSES as readonly string[]).includes(row.status)) planAgg.activeCount += 1;
    byPlanMap.set(row.planId, planAgg);
  }

  const currentPeriod = await buildPeriodMetrics(prisma, orgId, periodFrom, periodTo, filters);
  const prev = previousPeriod(periodFrom, periodTo);
  const previousPeriodMetrics = await buildPeriodMetrics(
    prisma,
    orgId,
    prev.from,
    prev.to,
    filters
  );

  const summary: CredentialAnalyticsSummary = {
    ...currentPeriod.summary,
    inventoryCount: inventory.length,
    activeCount,
    terminalCount,
  };

  const previousSummary: CredentialAnalyticsSummary = {
    ...previousPeriodMetrics.summary,
    inventoryCount: summary.inventoryCount,
    activeCount: summary.activeCount,
    terminalCount: summary.terminalCount,
  };

  const statusOrder = [
    'NEW',
    'SOLD',
    'ACTIVE',
    'ACTIVATED',
    'IN_USE',
    'PAUSED',
    'CONSUMED',
    'EXPIRED',
    'REVOKED',
  ];

  const byStatus: CredentialStatusRow[] = statusOrder
    .filter((s) => byStatusMap.has(s))
    .map((status) => ({ status, count: byStatusMap.get(status)! }));

  const byType: CredentialTypeRow[] = [...byTypeMap.entries()]
    .map(([type, stats]) => ({
      type,
      inventoryCount: stats.inventoryCount,
      activeCount: stats.activeCount,
      soldInPeriod: currentPeriod.typeSoldMap.get(type) ?? 0,
    }))
    .sort((a, b) => b.inventoryCount - a.inventoryCount);

  const byPlan: CredentialPlanRow[] = [...byPlanMap.entries()]
    .map(([planId, stats]) => {
      const period = currentPeriod.planSoldMap.get(planId) ?? {
        soldInPeriod: 0,
        expiredInPeriod: 0,
      };
      return {
        planId,
        code: stats.code,
        name: stats.name,
        inventoryCount: stats.inventoryCount,
        activeCount: stats.activeCount,
        soldInPeriod: period.soldInPeriod,
        expiredInPeriod: period.expiredInPeriod,
      };
    })
    .sort((a, b) => b.inventoryCount - a.inventoryCount);

  return {
    summary,
    previousSummary,
    dailyTrend: currentPeriod.dailyTrend,
    byStatus,
    byType,
    byPlan,
  };
}
