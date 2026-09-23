import type { PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';

/** Hard-deletes FreeRADIUS post-auth rows older than retention. No archive table. */
export async function purgeRadpostauth(
  prisma: PrismaClient,
  retentionDays: number,
  batchSize: number
): Promise<number> {
  if (retentionDays <= 0) return 0;

  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  let removed = 0;

  while (true) {
    const deleted = await prisma.$executeRaw`
      DELETE FROM radpostauth
      WHERE id IN (
        SELECT id
        FROM radpostauth
        WHERE authdate < ${cutoff}
        ORDER BY authdate
        LIMIT ${batchSize}
      )
    `;
    removed += deleted;
    if (deleted === 0) break;
  }

  logger.info(`[ops-archive] radpostauth purged: ${removed}`);
  return removed;
}
