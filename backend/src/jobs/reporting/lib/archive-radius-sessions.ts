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
    const deleted = await prisma.$executeRaw`
      WITH picked AS (
        SELECT s.id
        FROM wf_radius_session s
        WHERE s.status = 'STOP'
          AND s.stopped_at IS NOT NULL
          AND s.stopped_at < ${hotCutoff}
        ORDER BY s.stopped_at
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      ),
      inserted AS (
        INSERT INTO wf_radius_session_archive (
          id, source_id, org_id, station_id, credential_id,
          acct_session_id, user_name, calling_station_id, framed_ip_address,
          nas_ip_address, nas_identifier, status, started_at, last_interim_at,
          stopped_at, input_bytes, output_bytes, total_bytes, session_time_sec,
          terminate_cause
        )
        SELECT
          -- Hot-table columns callingStationId, inputBytes, outputBytes,
          -- totalBytes, and sessionTimeSec were created without @map.
          gen_random_uuid(),
          s.id,
          s.org_id,
          s.station_id,
          s.credential_id,
          s.acct_session_id,
          s.user_name,
          s."callingStationId",
          s.framed_ip_address,
          s.nas_ip_address,
          s.nas_identifier,
          s.status,
          s.started_at,
          s.last_interim_at,
          s.stopped_at,
          s."inputBytes",
          s."outputBytes",
          s."totalBytes",
          s."sessionTimeSec",
          s.terminate_cause
        FROM wf_radius_session s
        JOIN picked ON picked.id = s.id
        ON CONFLICT (source_id) DO NOTHING
        RETURNING source_id
      )
      DELETE FROM wf_radius_session s
      USING picked
      WHERE s.id = picked.id
    `;
    archived += deleted;
    if (deleted === 0) break;
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
      where: {
        OR: [
          { stoppedAt: { lt: archiveCutoff } },
          { stoppedAt: null, startedAt: { lt: archiveCutoff } },
        ],
      },
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
