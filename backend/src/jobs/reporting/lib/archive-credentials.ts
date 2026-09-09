import type { CredentialStatus, PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';
import { endOpenRadiusSessionsForUser } from '@/features/shared/credentials/credential-sync.helpers';

const TERMINAL_STATUSES: CredentialStatus[] = ['EXPIRED', 'CONSUMED', 'REVOKED'];

function terminalAt(row: {
  status: CredentialStatus;
  expiresAt: Date | null;
  revokedAt: Date | null;
  updatedAt: Date;
}): Date | null {
  if (row.status === 'REVOKED' && row.revokedAt) return row.revokedAt;
  if ((row.status === 'EXPIRED' || row.status === 'CONSUMED') && row.expiresAt) {
    return row.expiresAt;
  }
  return row.updatedAt;
}

/**
 * Archives credentials in a terminal state after grace period.
 * Skips credentials with active RADIUS sessions (START / INTERIM).
 * Closes leftover open sessions from a previous life of the same voucher code
 * so the code can be reissued without Simultaneous-Use collisions.
 */
export async function archiveCredentials(
  prisma: PrismaClient,
  graceDays: number,
  batchSize: number
): Promise<number> {
  const cutoff = new Date(Date.now() - graceDays * 86_400_000);
  let archived = 0;

  while (true) {
    const candidates = await prisma.credential.findMany({
      where: {
        deletedAt: null,
        status: { in: TERMINAL_STATUSES },
      },
      take: batchSize,
      orderBy: { updatedAt: 'asc' },
    });

    if (candidates.length === 0) break;

    let progressed = false;
    for (const row of candidates) {
      const ended = terminalAt(row);
      if (!ended || ended >= cutoff) continue;

      const activeSession = await prisma.radiusSession.findFirst({
        where: {
          credentialId: row.id,
          status: { in: ['START', 'INTERIM'] },
        },
        select: { id: true },
      });
      if (activeSession) continue;

      await endOpenRadiusSessionsForUser(
        prisma,
        { username: row.username, token: row.token },
        'Archive-Credential-Reuse',
        { createdBefore: row.createdAt, portalSince: null },
      );

      const exists = await prisma.credentialArchive.findUnique({
        where: { sourceId: row.id },
        select: { id: true },
      });
      if (exists) {
        await prisma.credential.delete({ where: { id: row.id } });
        archived += 1;
        progressed = true;
        continue;
      }

      await prisma.$transaction([
        prisma.credentialArchive.create({
          data: {
            sourceId: row.id,
            orgId: row.orgId,
            type: row.type,
            status: row.status,
            planId: row.planId,
            stationId: row.stationId,
            resellerId: row.resellerId,
            token: row.token,
            username: row.username,
            passwordHash: row.passwordHash,
            soldAt: row.soldAt,
            activatedAt: row.activatedAt,
            expiresAt: row.expiresAt,
            revokedAt: row.revokedAt,
            timeRemainingSec: row.timeRemainingSec,
            dataRemainingMb: row.dataRemainingMb,
            sourceCreatedAt: row.createdAt,
            sourceUpdatedAt: row.updatedAt,
            archiveReason: `terminal_${row.status.toLowerCase()}`,
          },
        }),
        prisma.captivePortalSession.deleteMany({ where: { credentialId: row.id } }),
        prisma.credential.delete({ where: { id: row.id } }),
      ]);
      archived += 1;
      progressed = true;
    }

    if (!progressed || candidates.length < batchSize) break;
  }

  logger.info(`[ops-archive] credentials archived: ${archived}`);
  return archived;
}

export async function purgeExpiredCredentialArchives(
  prisma: PrismaClient,
  retentionDays: number,
  batchSize: number
): Promise<number> {
  if (retentionDays <= 0) return 0;
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  let removed = 0;

  while (true) {
    const rows = await prisma.credentialArchive.findMany({
      where: { archivedAt: { lt: cutoff } },
      select: { id: true },
      take: batchSize,
    });
    if (rows.length === 0) break;
    const result = await prisma.credentialArchive.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    removed += result.count;
    if (rows.length < batchSize) break;
  }

  logger.info(`[ops-archive] credential archives purged: ${removed}`);
  return removed;
}
