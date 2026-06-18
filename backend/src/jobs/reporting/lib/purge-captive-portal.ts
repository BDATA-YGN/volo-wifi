import type { PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';

/** Purges stale captive portal session rows (hot table only — short-lived data). */
export async function purgeCaptivePortalSessions(
  prisma: PrismaClient,
  retentionDays: number,
  batchSize: number
): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  let removed = 0;

  while (true) {
    const rows = await prisma.captivePortalSession.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
      take: batchSize,
    });
    if (rows.length === 0) break;
    const result = await prisma.captivePortalSession.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    removed += result.count;
    if (rows.length < batchSize) break;
  }

  logger.info(`[ops-archive] captive portal sessions purged: ${removed}`);
  return removed;
}
