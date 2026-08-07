import cron, { ScheduledTask } from 'node-cron';
import PrismaDBConnection from '@/prisma/prisma-client';
import { logger } from '@/logging/logger';
import { APP_TIMEZONE } from '@/utils/app-time';

const prisma = PrismaDBConnection.getConnection();

interface LogRetentionConfig {
  enabled: boolean;
  cron: string;
  auditRetentionDays: number;
  loginRetentionDays: number;
  batchSize: number;
}

const DEFAULTS: LogRetentionConfig = {
  enabled: true,
  cron: '0 3 * * *',
  auditRetentionDays: 90,
  loginRetentionDays: 60,
  batchSize: 5000,
};

const SETTING_KEYS = [
  'log_cleanup_enabled',
  'log_cleanup_cron',
  'audit_log_retention_days',
  'login_log_retention_days',
  'log_cleanup_batch_size',
] as const;

const toBool = (v: string | undefined, fallback: boolean) =>
  v === undefined ? fallback : ['true', '1', 'yes'].includes(v.toLowerCase());

const toInt = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

const loadConfig = async (): Promise<LogRetentionConfig> => {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
    });
    const m = new Map(rows.map((r) => [r.key, r.value]));
    return {
      enabled: toBool(m.get('log_cleanup_enabled'), DEFAULTS.enabled),
      cron: m.get('log_cleanup_cron')?.trim() || DEFAULTS.cron,
      auditRetentionDays: toInt(m.get('audit_log_retention_days'), DEFAULTS.auditRetentionDays),
      loginRetentionDays: toInt(m.get('login_log_retention_days'), DEFAULTS.loginRetentionDays),
      batchSize: Math.max(100, toInt(m.get('log_cleanup_batch_size'), DEFAULTS.batchSize)),
    };
  } catch (err) {
    logger.warn('[log-cleanup] Failed to load AppSetting; using defaults', { err });
    return { ...DEFAULTS };
  }
};

const deleteInBatches = async (
  label: string,
  total: () => Promise<number>,
  deleteBatch: (take: number) => Promise<number>,
  batchSize: number,
) => {
  const initial = await total();
  if (initial === 0) {
    logger.info(`[log-cleanup] ${label}: nothing to delete`);
    return 0;
  }
  let removed = 0;
  let safety = 1000;
  while (safety-- > 0) {
    const n = await deleteBatch(batchSize);
    if (n <= 0) break;
    removed += n;
    if (n < batchSize) break;
  }
  logger.info(`[log-cleanup] ${label}: deleted ${removed} of ${initial} expired rows`);
  return removed;
};

const cleanupAuditLogs = async (days: number, batchSize: number) => {
  if (days <= 0) return 0;
  const cutoff = new Date(Date.now() - days * 86_400_000);
  return deleteInBatches(
    'audit-log',
    () => prisma.auditLog.count({ where: { timestamp: { lt: cutoff } } }),
    async (take) => {
      const rows = await prisma.auditLog.findMany({
        where: { timestamp: { lt: cutoff } },
        select: { id: true },
        take,
      });
      if (rows.length === 0) return 0;
      const result = await prisma.auditLog.deleteMany({
        where: { id: { in: rows.map((r) => r.id) } },
      });
      return result.count;
    },
    batchSize,
  );
};

const cleanupLoginLogs = async (days: number, batchSize: number) => {
  if (days <= 0) return 0;
  const cutoff = new Date(Date.now() - days * 86_400_000);
  return deleteInBatches(
    'login-log',
    () => prisma.loginLog.count({ where: { loginDateTime: { lt: cutoff } } }),
    async (take) => {
      const rows = await prisma.loginLog.findMany({
        where: { loginDateTime: { lt: cutoff } },
        select: { id: true },
        take,
      });
      if (rows.length === 0) return 0;
      const result = await prisma.loginLog.deleteMany({
        where: { id: { in: rows.map((r) => r.id) } },
      });
      return result.count;
    },
    batchSize,
  );
};

/** Module-level state so we can reschedule when the cron expression changes. */
let scheduled: ScheduledTask | null = null;
let activeCron: string | null = null;
let running = false;

const runOnce = async () => {
  if (running) {
    logger.warn('[log-cleanup] Previous run still in progress; skipping tick');
    return;
  }
  running = true;
  const startedAt = Date.now();
  try {
    const cfg = await loadConfig();
    if (!cfg.enabled) {
      logger.info('[log-cleanup] Disabled by AppSetting');
      return;
    }
    logger.info(
      `[log-cleanup] Tick start (audit=${cfg.auditRetentionDays}d, login=${cfg.loginRetentionDays}d, batch=${cfg.batchSize})`,
    );
    const [audit, login] = await Promise.all([
      cleanupAuditLogs(cfg.auditRetentionDays, cfg.batchSize),
      cleanupLoginLogs(cfg.loginRetentionDays, cfg.batchSize),
    ]);
    logger.info(
      `[log-cleanup] Tick done in ${Date.now() - startedAt}ms (audit=${audit}, login=${login})`,
    );
  } catch (err) {
    logger.error('[log-cleanup] Tick failed', { err });
  } finally {
    running = false;
  }
};

/**
 * Starts the log-cleanup cron job.
 *
 * Reads schedule from `AppSetting.log_cleanup_cron`. Every tick re-reads the
 * settings, so changes apply on the next run. If the cron expression itself
 * changes, the schedule is rebuilt by `rescheduleIfChanged()`.
 */
export const startLogCleanupJob = async (): Promise<ScheduledTask | null> => {
  const cfg = await loadConfig();

  if (!cron.validate(cfg.cron)) {
    logger.warn(
      `[log-cleanup] Invalid cron expression "${cfg.cron}"; falling back to "${DEFAULTS.cron}"`,
    );
    cfg.cron = DEFAULTS.cron;
  }

  scheduled = cron.schedule(cfg.cron, runOnce, {
    timezone: process.env.TZ || APP_TIMEZONE,
  });
  activeCron = cfg.cron;
  logger.info(
    `[log-cleanup] Scheduled with "${cfg.cron}" (enabled=${cfg.enabled}, audit=${cfg.auditRetentionDays}d, login=${cfg.loginRetentionDays}d)`,
  );

  // Hourly self-check: if the admin changed the cron string, re-schedule.
  cron.schedule('0 * * * *', () => {
    void rescheduleIfChanged();
  });

  return scheduled;
};

const rescheduleIfChanged = async () => {
  try {
    const cfg = await loadConfig();
    if (cfg.cron === activeCron) return;
    if (!cron.validate(cfg.cron)) {
      logger.warn(`[log-cleanup] Ignoring invalid cron change "${cfg.cron}"`);
      return;
    }
    scheduled?.stop();
    scheduled = cron.schedule(cfg.cron, runOnce, {
      timezone: process.env.TZ || APP_TIMEZONE,
    });
    activeCron = cfg.cron;
    logger.info(`[log-cleanup] Re-scheduled with new expression "${cfg.cron}"`);
  } catch (err) {
    logger.warn('[log-cleanup] Reschedule check failed', { err });
  }
};
