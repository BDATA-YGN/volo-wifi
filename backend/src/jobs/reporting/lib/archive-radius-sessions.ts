import type { PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';

/**
 * Copies stopped RADIUS sessions older than `hotCutoff` to archive, then deletes from hot table.
 */
export async function archiveRadiusSessions(
  prisma: PrismaClient,
  hotCutoff: Date,
  batchSize: number
): Promise<number> {
  let archived = 0;

  while (true) {
    const rows = await prisma.radiusSession.findMany({
      where: {
        status: 'STOP',
        stoppedAt: { not: null, lt: hotCutoff },
      },
      take: batchSize,
      orderBy: { stoppedAt: 'asc' },
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      const exists = await prisma.radiusSessionArchive.findUnique({
        where: { sourceId: row.id },
        select: { id: true },
      });
      if (exists) {
        await prisma.radiusSession.delete({ where: { id: row.id } });
        archived += 1;
        continue;
      }

      await prisma.$transaction([
        prisma.radiusSessionArchive.create({
          data: {
            sourceId: row.id,
            orgId: row.orgId,
            stationId: row.stationId,
            credentialId: row.credentialId,
            acctSessionId: row.acctSessionId,
            userName: row.userName,
            callingStationId: row.callingStationId,
            framedIpAddress: row.framedIpAddress,
            nasIpAddress: row.nasIpAddress,
            nasIdentifier: row.nasIdentifier,
            status: row.status,
            startedAt: row.startedAt,
            lastInterimAt: row.lastInterimAt,
            stoppedAt: row.stoppedAt,
            inputBytes: row.inputBytes,
            outputBytes: row.outputBytes,
            totalBytes: row.totalBytes,
            sessionTimeSec: row.sessionTimeSec,
            terminateCause: row.terminateCause,
          },
        }),
        prisma.radiusSession.delete({ where: { id: row.id } }),
      ]);
      archived += 1;
    }

    if (rows.length < batchSize) break;
  }

  logger.info(`[ops-archive] radius sessions archived: ${archived}`);
  return archived;
}

export async function purgeExpiredRadiusArchives(
  prisma: PrismaClient,
  archiveCutoff: Date,
  batchSize: number
): Promise<number> {
  let removed = 0;

  while (true) {
    const rows = await prisma.radiusSessionArchive.findMany({
      where: { archivedAt: { lt: archiveCutoff } },
      select: { id: true },
      take: batchSize,
    });
    if (rows.length === 0) break;
    const result = await prisma.radiusSessionArchive.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    removed += result.count;
    if (rows.length < batchSize) break;
  }

  logger.info(`[ops-archive] radius session archives purged: ${removed}`);
  return removed;
}
