import type { PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';

/**
 * Hard-deletes pre-aggregated stat rows older than retention.
 * Stats are not operational — monthly/yearly rollups remain for long-range analytics.
 */
export async function purgeOldReportingStats(
  prisma: PrismaClient,
  retentionDays: number,
  batchSize: number
): Promise<{ dailySales: number; dailyRadius: number }> {
  if (retentionDays <= 0) return { dailySales: 0, dailyRadius: 0 };

  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  let dailySales = 0;
  let dailyRadius = 0;

  while (true) {
    const rows = await prisma.dailySalesStat.findMany({
      where: { date: { lt: cutoff } },
      select: { id: true },
      take: batchSize,
    });
    if (rows.length === 0) break;
    const result = await prisma.dailySalesStat.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    dailySales += result.count;
    if (rows.length < batchSize) break;
  }

  while (true) {
    const rows = await prisma.dailyRadiusUsageStat.findMany({
      where: { date: { lt: cutoff } },
      select: { id: true },
      take: batchSize,
    });
    if (rows.length === 0) break;
    const result = await prisma.dailyRadiusUsageStat.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    dailyRadius += result.count;
    if (rows.length < batchSize) break;
  }

  logger.info(
    `[ops-archive] reporting stats purged: dailySales=${dailySales}, dailyRadius=${dailyRadius}`
  );
  return { dailySales, dailyRadius };
}
