import { logger } from '@/logging/logger';
import { startLogCleanupJob } from './log-cleanup.job';
import { startReportingAggregateJob } from './reporting-aggregate.job';
import { startOpsArchiveJob } from './ops-archive.job';

/**
 * Starts every recurring background job for the API process.
 *
 * Called from `server.ts → initializeCronJobs()` after the database, services,
 * and HTTP listeners are ready. Each job is wrapped in its own try/catch so a
 * single broken job never prevents the others from running.
 */
export const startAllJobs = async (): Promise<void> => {
  const jobs: { name: string; run: () => Promise<unknown> }[] = [
    { name: 'log-cleanup', run: startLogCleanupJob },
    { name: 'reporting-aggregate', run: startReportingAggregateJob },
    { name: 'ops-archive', run: startOpsArchiveJob },
  ];

  for (const job of jobs) {
    try {
      await job.run();
    } catch (err) {
      logger.error(`[jobs] Failed to start "${job.name}"`, { err });
    }
  }
};

export { startLogCleanupJob };
export { startReportingAggregateJob, runReportingAggregateTick, runReportingRollupTick } from './reporting-aggregate.job';
export { startOpsArchiveJob, runOpsArchiveTick } from './ops-archive.job';
