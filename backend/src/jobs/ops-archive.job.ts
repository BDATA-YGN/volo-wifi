import cron, { ScheduledTask } from 'node-cron';
import PrismaDBConnection from '@/prisma/prisma-client';
import { logger } from '@/logging/logger';
import { APP_TIMEZONE } from '@/utils/app-time';
import {
  archiveCredentials,
  purgeExpiredCredentialArchives,
} from './reporting/lib/archive-credentials';
import {
  archiveRadiusSessions,
  purgeExpiredRadiusArchives,
} from './reporting/lib/archive-radius-sessions';
import {
  archiveSaleOrders,
  purgeDraftSaleOrders,
  purgeExpiredSaleOrderArchives,
} from './reporting/lib/archive-sales';
import { purgeCaptivePortalSessions } from './reporting/lib/purge-captive-portal';
import { purgeOldReportingStats } from './reporting/lib/purge-reporting-stats';
import {
  loadOpsArchiveSettings,
  OPS_ARCHIVE_DEFAULTS,
} from './reporting/lib/ops-archive-settings';

const prisma = PrismaDBConnection.getConnection();

let scheduled: ScheduledTask | null = null;
let activeCron: string | null = null;
let running = false;

/**
 * Archives / purges operational tables in dependency order:
 * 1. RADIUS sessions → archive
 * 2. Captive portal → purge
 * 3. Credentials (terminal) → archive
 * 4. Sale orders (closed) → archive; drafts → purge
 * 5. Reporting daily stats → purge (not archived)
 * 6. Expired archive rows → purge
 */
export async function runOpsArchiveTick(): Promise<void> {
  if (running) {
    logger.warn('[ops-archive] Previous run still in progress; skipping');
    return;
  }
  running = true;
  const startedAt = Date.now();

  try {
    const cfg = await loadOpsArchiveSettings(prisma);
    if (!cfg.enabled) {
      logger.info('[ops-archive] Disabled by AppSetting');
      return;
    }

    const now = Date.now();
    const radiusHotCutoff = new Date(now - cfg.radiusSessionHotRetentionDays * 86_400_000);
    const radiusArchiveCutoff = new Date(now - cfg.radiusSessionArchiveRetentionDays * 86_400_000);

    logger.info(
      `[ops-archive] Tick start (credentialGrace=${cfg.credentialGraceDays}d, radiusHot=${cfg.radiusSessionHotRetentionDays}d, saleHot=${cfg.saleOrderHotRetentionDays}d, batch=${cfg.batchSize})`
    );

    const radiusArchived = await archiveRadiusSessions(prisma, radiusHotCutoff, cfg.batchSize);
    const captivePurged = await purgeCaptivePortalSessions(
      prisma,
      cfg.captivePortalRetentionDays,
      cfg.batchSize
    );
    const credentialsArchived = await archiveCredentials(
      prisma,
      cfg.credentialGraceDays,
      cfg.batchSize
    );
    const salesArchived = await archiveSaleOrders(
      prisma,
      cfg.saleOrderHotRetentionDays,
      cfg.batchSize
    );
    const draftsPurged = await purgeDraftSaleOrders(
      prisma,
      cfg.saleOrderDraftRetentionDays,
      cfg.batchSize
    );
    const statsPurged = await purgeOldReportingStats(
      prisma,
      cfg.reportingStatsRetentionDays,
      cfg.batchSize
    );

    const [radiusPurged, credentialsPurged, salesPurged] = await Promise.all([
      purgeExpiredRadiusArchives(prisma, radiusArchiveCutoff, cfg.batchSize),
      purgeExpiredCredentialArchives(prisma, cfg.credentialArchiveRetentionDays, cfg.batchSize),
      purgeExpiredSaleOrderArchives(prisma, cfg.saleOrderArchiveRetentionDays, cfg.batchSize),
    ]);

    logger.info(
      `[ops-archive] Tick done in ${Date.now() - startedAt}ms ` +
        `(radius=${radiusArchived}, captive=${captivePurged}, credentials=${credentialsArchived}, ` +
        `sales=${salesArchived}, drafts=${draftsPurged}, stats=${statsPurged.dailySales}+${statsPurged.dailyRadius}, ` +
        `purgedRadius=${radiusPurged}, purgedCredentials=${credentialsPurged}, purgedSales=${salesPurged})`
    );
  } catch (err) {
    logger.error('[ops-archive] Tick failed', { err });
  } finally {
    running = false;
  }
}

export const startOpsArchiveJob = async (): Promise<ScheduledTask | null> => {
  const cfg = await loadOpsArchiveSettings(prisma);

  if (!cron.validate(cfg.cron)) {
    logger.warn(
      `[ops-archive] Invalid cron "${cfg.cron}"; using "${OPS_ARCHIVE_DEFAULTS.cron}"`
    );
    cfg.cron = OPS_ARCHIVE_DEFAULTS.cron;
  }

  scheduled = cron.schedule(cfg.cron, () => void runOpsArchiveTick(), {
    timezone: process.env.TZ || APP_TIMEZONE,
  });
  activeCron = cfg.cron;

  logger.info(`[ops-archive] Scheduled with "${cfg.cron}" (enabled=${cfg.enabled})`);

  cron.schedule('0 * * * *', async () => {
    try {
      const next = await loadOpsArchiveSettings(prisma);
      if (next.cron === activeCron) return;
      if (!cron.validate(next.cron)) return;
      scheduled?.stop();
      scheduled = cron.schedule(next.cron, () => void runOpsArchiveTick(), {
        timezone: process.env.TZ || APP_TIMEZONE,
      });
      activeCron = next.cron;
      logger.info(`[ops-archive] Re-scheduled with "${next.cron}"`);
    } catch (err) {
      logger.warn('[ops-archive] Reschedule check failed', { err });
    }
  });

  return scheduled;
};
