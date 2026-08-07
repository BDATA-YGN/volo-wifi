import { Prisma, PrismaClient } from '@/generated/prisma/client';
import {
  appDayKey as utcDayKey,
  eachAppDay,
  previousAppPeriod,
  resolvePeriodFromPresetDays,
} from '@/utils/app-time';

export type VoucherRunSummary = {
  batchCount: number;
  totalIssued: number;
  totalRemaining: number;
  totalRedeemed: number;
  utilizationPercent: number;
  activatedInPeriod: number;
  expiredInPeriod: number;
  revokedInPeriod: number;
};

export type VoucherRunDailyPoint = {
  date: string;
  batchesCreated: number;
  vouchersIssued: number;
  vouchersActivated: number;
};

export type VoucherRunBatchRow = {
  batchId: string;
  batchNo: string;
  prefix: string | null;
  planId: string;
  planCode: string;
  planName: string;
  stationId: string | null;
  stationCode: string | null;
  stationName: string | null;
  quantity: number;
  remaining: number;
  redeemed: number;
  utilizationPercent: number;
  activatedInPeriod: number;
  createdAt: string;
  statusBreakdown: Record<string, number>;
};

export type VoucherRunPlanRow = {
  planId: string;
  code: string;
  name: string;
  batchCount: number;
  totalIssued: number;
  totalRemaining: number;
  totalRedeemed: number;
  utilizationPercent: number;
};

export type VoucherRunStatusRow = {
  status: string;
  count: number;
};

export type VoucherRunAnalyticsPayload = {
  summary: VoucherRunSummary;
  previousSummary: VoucherRunSummary;
  dailyTrend: VoucherRunDailyPoint[];
  byBatch: VoucherRunBatchRow[];
  byPlan: VoucherRunPlanRow[];
  byStatus: VoucherRunStatusRow[];
};

type BatchMeta = {
  id: string;
  batchNo: string;
  prefix: string | null;
  planId: string;
  planCode: string;
  planName: string;
  stationId: string | null;
  stationCode: string | null;
  stationName: string | null;
  quantity: number;
  remainingQuantity: number;
  createdAt: Date;
};

type CredentialRow = {
  id: string;
  voucherBatchId: string | null;
  token: string | null;
  planId: string;
  stationId: string | null;
  status: string;
  createdAt: Date;
  soldAt: Date | null;
  activatedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

type VoucherFilters = {
  planId?: string;
  stationId?: string;
  batchId?: string;
};

function emptySummary(): VoucherRunSummary {
  return {
    batchCount: 0,
    totalIssued: 0,
    totalRemaining: 0,
    totalRedeemed: 0,
    utilizationPercent: 0,
    activatedInPeriod: 0,
    expiredInPeriod: 0,
    revokedInPeriod: 0,
  };
}

function utilizationPercent(issued: number, remaining: number): number {
  if (issued <= 0) return 0;
  const redeemed = Math.max(0, issued - remaining);
  return Math.round((redeemed / issued) * 1000) / 10;
}

function finalizeSummary(
  batchCount: number,
  totalIssued: number,
  totalRemaining: number,
  activatedInPeriod: number,
  expiredInPeriod: number,
  revokedInPeriod: number
): VoucherRunSummary {
  const totalRedeemed = Math.max(0, totalIssued - totalRemaining);
  return {
    batchCount,
    totalIssued,
    totalRemaining,
    totalRedeemed,
    utilizationPercent: utilizationPercent(totalIssued, totalRemaining),
    activatedInPeriod,
    expiredInPeriod,
    revokedInPeriod,
  };
}

function mergeDailyTrend(
  batchesByDay: Map<string, { batchesCreated: number; vouchersIssued: number }>,
  activatedByDay: Map<string, number>,
  periodFrom: Date,
  periodTo: Date
): VoucherRunDailyPoint[] {
  const points: VoucherRunDailyPoint[] = [];
  for (const cursor of eachAppDay(periodFrom, periodTo)) {
    const key = utcDayKey(cursor);
    const batchDay = batchesByDay.get(key) ?? { batchesCreated: 0, vouchersIssued: 0 };
    points.push({
      date: key,
      batchesCreated: batchDay.batchesCreated,
      vouchersIssued: batchDay.vouchersIssued,
      vouchersActivated: activatedByDay.get(key) ?? 0,
    });
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
  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  return resolvePeriodFromPresetDays(days, periodTo);
}

export function previousPeriod(periodFrom: Date, periodTo: Date): { from: Date; to: Date } {
  return previousAppPeriod(periodFrom, periodTo);
}

async function loadBatches(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: VoucherFilters
): Promise<BatchMeta[]> {
  const batches = await prisma.voucherBatch.findMany({
    where: {
      orgId,
      deletedAt: null,
      resellerId: null,
      createdAt: { gte: periodFrom, lte: periodTo },
      ...(filters?.planId ? { planId: filters.planId } : {}),
      ...(filters?.stationId ? { stationId: filters.stationId } : {}),
      ...(filters?.batchId ? { id: filters.batchId } : {}),
    },
    select: {
      id: true,
      batchNo: true,
      prefix: true,
      planId: true,
      quantity: true,
      remainingQuantity: true,
      stationId: true,
      createdAt: true,
      plan: { select: { code: true, name: true } },
      station: { select: { code: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return batches.map((b) => ({
    id: b.id,
    batchNo: b.batchNo,
    prefix: b.prefix,
    planId: b.planId,
    planCode: b.plan.code,
    planName: b.plan.name,
    stationId: b.stationId,
    stationCode: b.station?.code ?? null,
    stationName: b.station?.name ?? null,
    quantity: b.quantity,
    remainingQuantity: b.remainingQuantity,
    createdAt: b.createdAt,
  }));
}

async function loadCredentialsForBatches(
  prisma: PrismaClient,
  orgId: string,
  batches: BatchMeta[]
): Promise<CredentialRow[]> {
  if (batches.length === 0) return [];

  const batchIds = batches.map((b) => b.id);

  return prisma.credential.findMany({
    where: {
      orgId,
      type: 'VOUCHER_TOKEN',
      deletedAt: null,
      voucherBatchId: { in: batchIds },
    },
    select: {
      id: true,
      voucherBatchId: true,
      token: true,
      planId: true,
      stationId: true,
      status: true,
      createdAt: true,
      soldAt: true,
      activatedAt: true,
      expiresAt: true,
      revokedAt: true,
    },
  });
}

function buildAnalyticsFromBatches(
  batches: BatchMeta[],
  credentials: CredentialRow[],
  periodFrom: Date,
  periodTo: Date
): Omit<VoucherRunAnalyticsPayload, 'previousSummary'> {
  if (batches.length === 0) {
    return {
      summary: emptySummary(),
      dailyTrend: mergeDailyTrend(new Map(), new Map(), periodFrom, periodTo),
      byBatch: [],
      byPlan: [],
      byStatus: [],
    };
  }

  const credentialsByBatch = new Map<string, CredentialRow[]>();
  const batchesByDay = new Map<string, { batchesCreated: number; vouchersIssued: number }>();
  const activatedByDay = new Map<string, number>();

  for (const batch of batches) {
    credentialsByBatch.set(batch.id, []);
  }

  for (const credential of credentials) {
    if (!credential.voucherBatchId) continue;
    const bucket = credentialsByBatch.get(credential.voucherBatchId);
    if (bucket) bucket.push(credential);

    const saleDay = credential.soldAt ?? credential.createdAt;
    if (saleDay >= periodFrom && saleDay <= periodTo) {
      const dayKey = utcDayKey(saleDay);
      const batchDay = batchesByDay.get(dayKey) ?? { batchesCreated: 0, vouchersIssued: 0 };
      batchDay.vouchersIssued += 1;
      batchesByDay.set(dayKey, batchDay);
    }
  }

  const statusMap = new Map<string, number>();
  const planMap = new Map<string, VoucherRunPlanRow>();

  let totalIssued = 0;
  let totalRemaining = 0;
  let activatedInPeriod = 0;
  let expiredInPeriod = 0;
  let revokedInPeriod = 0;

  const byBatch: VoucherRunBatchRow[] = [];

  for (const batch of batches) {
    const batchCreds = credentialsByBatch.get(batch.id) ?? [];
    const statusBreakdown: Record<string, number> = {};
    const remaining = batch.remainingQuantity;
    let batchActivatedInPeriod = 0;

    for (const cred of batchCreds) {
      statusBreakdown[cred.status] = (statusBreakdown[cred.status] ?? 0) + 1;
      statusMap.set(cred.status, (statusMap.get(cred.status) ?? 0) + 1);

      if (cred.activatedAt && cred.activatedAt >= periodFrom && cred.activatedAt <= periodTo) {
        batchActivatedInPeriod += 1;
        activatedInPeriod += 1;
        incrementDay(activatedByDay, cred.activatedAt);
      }

      if (cred.expiresAt && cred.expiresAt >= periodFrom && cred.expiresAt <= periodTo) {
        expiredInPeriod += 1;
      }

      if (cred.revokedAt && cred.revokedAt >= periodFrom && cred.revokedAt <= periodTo) {
        revokedInPeriod += 1;
      }
    }

    const issued = batch.quantity;
    const redeemed = Math.max(0, issued - remaining);
    totalIssued += issued;
    totalRemaining += remaining;

    const dayKey = utcDayKey(batch.createdAt);
    const batchDay = batchesByDay.get(dayKey) ?? { batchesCreated: 0, vouchersIssued: 0 };
    batchDay.batchesCreated += 1;
    batchesByDay.set(dayKey, batchDay);

    byBatch.push({
      batchId: batch.id,
      batchNo: batch.batchNo,
      prefix: batch.prefix,
      planId: batch.planId,
      planCode: batch.planCode,
      planName: batch.planName,
      stationId: batch.stationId,
      stationCode: batch.stationCode,
      stationName: batch.stationName,
      quantity: issued,
      remaining,
      redeemed,
      utilizationPercent: utilizationPercent(issued, remaining),
      activatedInPeriod: batchActivatedInPeriod,
      createdAt: batch.createdAt.toISOString(),
      statusBreakdown,
    });

    const planRow =
      planMap.get(batch.planId) ??
      ({
        planId: batch.planId,
        code: batch.planCode,
        name: batch.planName,
        batchCount: 0,
        totalIssued: 0,
        totalRemaining: 0,
        totalRedeemed: 0,
        utilizationPercent: 0,
      } as VoucherRunPlanRow);

    planRow.batchCount += 1;
    planRow.totalIssued += issued;
    planRow.totalRemaining += remaining;
    planRow.totalRedeemed += redeemed;
    planMap.set(batch.planId, planRow);
  }

  const byPlan = [...planMap.values()]
    .map((p) => ({
      ...p,
      utilizationPercent: utilizationPercent(p.totalIssued, p.totalRemaining),
    }))
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent || b.totalIssued - a.totalIssued);

  const byStatus = [...statusMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  return {
    summary: finalizeSummary(
      batches.length,
      totalIssued,
      totalRemaining,
      activatedInPeriod,
      expiredInPeriod,
      revokedInPeriod
    ),
    dailyTrend: mergeDailyTrend(batchesByDay, activatedByDay, periodFrom, periodTo),
    byBatch: byBatch.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    byPlan,
    byStatus,
  };
}

export async function buildVoucherRunAnalytics(
  prisma: PrismaClient,
  orgId: string,
  periodFrom: Date,
  periodTo: Date,
  filters?: VoucherFilters
): Promise<VoucherRunAnalyticsPayload> {
  const batches = await loadBatches(prisma, orgId, periodFrom, periodTo, filters);
  const credentials = await loadCredentialsForBatches(prisma, orgId, batches);
  const current = buildAnalyticsFromBatches(batches, credentials, periodFrom, periodTo);

  const prev = previousPeriod(periodFrom, periodTo);
  const prevBatches = await loadBatches(prisma, orgId, prev.from, prev.to, filters);
  const prevCredentials = await loadCredentialsForBatches(prisma, orgId, prevBatches);
  const previous = buildAnalyticsFromBatches(
    prevBatches,
    prevCredentials,
    prev.from,
    prev.to
  );

  return {
    ...current,
    previousSummary: previous.summary,
  };
}
