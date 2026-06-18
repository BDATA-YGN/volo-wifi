import cron, { ScheduledTask } from 'node-cron';
import PrismaDBConnection from '@/prisma/prisma-client';
import { logger } from '@/logging/logger';
import { aggregateDailyRadiusForDate } from './reporting/lib/aggregate-daily-radius';
import { aggregateDailySalesForDate } from './reporting/lib/aggregate-daily-sales';
import { addUtcDays, eachUtcDay, startOfUtcDay } from './reporting/lib/dates';
import { rollupPreviousClosedPeriods } from './reporting/lib/rollup-periods';
import {
  AGGREGATE_DEFAULTS,
  loadReportingAggregateSettings,
} from './reporting/lib/settings';

const prisma = PrismaDBConnection.getConnection();

let scheduled: ScheduledTask | null = null;
let rollupScheduled: ScheduledTask | null = null;
let activeCron: string | null = null;
let activeRollupCron: string | null = null;
let running = false;
let rollupRunning = false;

export async function runReportingAggregateTick(): Promise<void> {
  if (running) {
    logger.warn('[reporting-aggregate] Previous run still in progress; skipping');
    return;
  }
  running = true;
  const startedAt = Date.now();
  try {
    const cfg = await loadReportingAggregateSettings(prisma);
    if (!cfg.enabled) {
      logger.info('[reporting-aggregate] Disabled by AppSetting');
      return;
    }

    const today = startOfUtcDay(new Date());
    const from = addUtcDays(today, -(cfg.lookbackDays - 1));
    const days = eachUtcDay(from, today);

    logger.info(
      `[reporting-aggregate] Tick start (${days.length} UTC days, lookback=${cfg.lookbackDays})`
    );

    let salesBuckets = 0;
    let radiusBuckets = 0;
    for (const day of days) {
      salesBuckets += await aggregateDailySalesForDate(prisma, day);
      radiusBuckets += await aggregateDailyRadiusForDate(prisma, day);
    }

    logger.info(
      `[reporting-aggregate] Tick done in ${Date.now() - startedAt}ms (salesBuckets=${salesBuckets}, radiusBuckets=${radiusBuckets})`
    );
  } catch (err) {
    logger.error('[reporting-aggregate] Tick failed', { err });
  } finally {
    running = false;
  }
}

export async function runReportingRollupTick(): Promise<void> {
  if (rollupRunning) {
    logger.warn('[reporting-rollup] Previous run still in progress; skipping');
    return;
  }
  rollupRunning = true;
  const startedAt = Date.now();
  try {
    const cfg = await loadReportingAggregateSettings(prisma);
    if (!cfg.rollupEnabled) {
      logger.info('[reporting-rollup] Disabled by AppSetting');
      return;
    }
    logger.info('[reporting-rollup] Tick start');
    await rollupPreviousClosedPeriods(prisma);
    logger.info(`[reporting-rollup] Tick done in ${Date.now() - startedAt}ms`);
  } catch (err) {
    logger.error('[reporting-rollup] Tick failed', { err });
  } finally {
    rollupRunning = false;
  }
}

const scheduleAggregate = (expression: string) => {
  if (!cron.validate(expression)) {
    logger.warn(
      `[reporting-aggregate] Invalid cron "${expression}"; using "${AGGREGATE_DEFAULTS.cron}"`
    );
    expression = AGGREGATE_DEFAULTS.cron;
  }
  scheduled?.stop();
  scheduled = cron.schedule(expression, () => void runReportingAggregateTick(), {
    timezone: process.env.TZ || 'Asia/Yangon',
  });
  activeCron = expression;
};

const scheduleRollup = (expression: string) => {
  if (!cron.validate(expression)) {
    logger.warn(
      `[reporting-rollup] Invalid cron "${expression}"; using "${AGGREGATE_DEFAULTS.rollupCron}"`
    );
    expression = AGGREGATE_DEFAULTS.rollupCron;
  }
  rollupScheduled?.stop();
  rollupScheduled = cron.schedule(expression, () => void runReportingRollupTick(), {
    timezone: process.env.TZ || 'Asia/Yangon',
  });
  activeRollupCron = expression;
};

const rescheduleIfChanged = async () => {
  try {
    const cfg = await loadReportingAggregateSettings(prisma);
    if (cfg.cron !== activeCron) scheduleAggregate(cfg.cron);
    if (cfg.rollupCron !== activeRollupCron) scheduleRollup(cfg.rollupCron);
  } catch (err) {
    logger.warn('[reporting-aggregate] Reschedule check failed', { err });
  }
};

export const startReportingAggregateJob = async (): Promise<ScheduledTask | null> => {
  const cfg = await loadReportingAggregateSettings(prisma);
  scheduleAggregate(cfg.cron);
  scheduleRollup(cfg.rollupCron);

  logger.info(
    `[reporting-aggregate] Scheduled aggregate="${cfg.cron}" rollup="${cfg.rollupCron}" (enabled=${cfg.enabled}, lookback=${cfg.lookbackDays}d)`
  );

  cron.schedule('0 * * * *', () => {
    void rescheduleIfChanged();
  });

  return scheduled;
};
