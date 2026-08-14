import { Prisma, type PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';
import { endOfUtcDay, startOfUtcDay, utcDayBucket } from './dates';

type BucketKey = string;

type RadiusBucket = {
  orgId: string;
  date: Date;
  stationId: string | null;
  resellerId: string | null;
  planId: string | null;
  sessionsCount: number;
  credentialIds: Set<string>;
  totalInputBytes: bigint;
  totalOutputBytes: bigint;
  totalBytes: bigint;
  totalSessionTimeSec: number;
};

function bucketKey(
  orgId: string,
  stationId: string | null,
  resellerId: string | null,
  planId: string | null
): BucketKey {
  return [orgId, stationId ?? '', resellerId ?? '', planId ?? ''].join('|');
}

function bigintOrZero(v: bigint | null | undefined): bigint {
  return v ?? BigInt(0);
}

/**
 * Rebuilds `rpt_daily_radius_usage_stat` for one UTC day from `wf_radius_session` rows
 * whose `startedAt` falls in that day.
 */
export async function aggregateDailyRadiusForDate(
  prisma: PrismaClient,
  bucketDate: Date,
  orgIdFilter?: string
): Promise<number> {
  const dayStart = startOfUtcDay(bucketDate);
  const dayEnd = endOfUtcDay(bucketDate);
  const bucket = utcDayBucket(bucketDate);

  const sessions = await prisma.radiusSession.findMany({
    where: {
      startedAt: { gte: dayStart, lte: dayEnd },
      ...(orgIdFilter ? { orgId: orgIdFilter } : {}),
    },
    select: {
      id: true,
      orgId: true,
      stationId: true,
      credentialId: true,
      inputBytes: true,
      outputBytes: true,
      totalBytes: true,
      sessionTimeSec: true,
      credential: {
        select: { orgId: true, stationId: true, resellerId: true, planId: true },
      },
    },
  });

  const buckets = new Map<BucketKey, RadiusBucket>();

  for (const session of sessions) {
    const orgId = session.orgId ?? session.credential?.orgId;
    if (!orgId) continue;

    const stationId = session.stationId ?? session.credential?.stationId ?? null;
    const resellerId = session.credential?.resellerId ?? null;
    const planId = session.credential?.planId ?? null;

    const key = bucketKey(orgId, stationId, resellerId, planId);
    const row =
      buckets.get(key) ??
      ({
        orgId,
        date: bucket,
        stationId,
        resellerId,
        planId,
        sessionsCount: 0,
        credentialIds: new Set<string>(),
        totalInputBytes: BigInt(0),
        totalOutputBytes: BigInt(0),
        totalBytes: BigInt(0),
        totalSessionTimeSec: 0,
      } satisfies RadiusBucket);

    row.sessionsCount += 1;
    if (session.credentialId) row.credentialIds.add(session.credentialId);
    row.totalInputBytes += bigintOrZero(session.inputBytes);
    row.totalOutputBytes += bigintOrZero(session.outputBytes);
    row.totalBytes += bigintOrZero(session.totalBytes);
    row.totalSessionTimeSec += session.sessionTimeSec ?? 0;
    buckets.set(key, row);
  }

  await prisma.$transaction(async (tx) => {
    await tx.dailyRadiusUsageStat.deleteMany({
      where: {
        ...(orgIdFilter ? { orgId: orgIdFilter } : {}),
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    if (buckets.size === 0) return;

    await tx.dailyRadiusUsageStat.createMany({
      data: [...buckets.values()].map((b) => ({
        orgId: b.orgId,
        date: b.date,
        stationId: b.stationId,
        resellerId: b.resellerId,
        planId: b.planId,
        sessionsCount: b.sessionsCount,
        uniqueCredentials: b.credentialIds.size,
        totalInputBytes: b.totalInputBytes,
        totalOutputBytes: b.totalOutputBytes,
        totalBytes: b.totalBytes,
        totalSessionTimeSec: b.totalSessionTimeSec,
      })),
    });
  });

  logger.info(
    `[reporting] daily radius ${bucket.toISOString()}: ${buckets.size} buckets from ${sessions.length} sessions`
  );
  return buckets.size;
}
