import cron, { ScheduledTask } from 'node-cron';
import PrismaDBConnection from '@/prisma/prisma-client';
import { logger } from '@/logging/logger';
import { APP_TIMEZONE } from '@/utils/app-time';

const prisma = PrismaDBConnection.getConnection();

interface CredentialSyncConfig {
  enabled: boolean;
  cron: string;
  /** Close START/INTERIM RADIUS rows with no activity longer than this (minutes). */
  staleInterimMinutes: number;
  /** Force-close any open RADIUS row older than this (hours). */
  maxOpenHours: number;
}

const DEFAULTS: CredentialSyncConfig = {
  enabled: true,
  /** Every 3 minutes — matches Captive Portal Implementation Spec §10. */
  cron: '*/3 * * * *',
  staleInterimMinutes: 5,
  maxOpenHours: 2,
};

const SETTING_KEYS = [
  'credential_sync_enabled',
  'credential_sync_cron',
  'credential_sync_stale_interim_minutes',
  'credential_sync_max_open_hours',
] as const;

const toBool = (v: string | undefined, fallback: boolean) =>
  v === undefined ? fallback : ['true', '1', 'yes'].includes(v.toLowerCase());

const toInt = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

const loadConfig = async (): Promise<CredentialSyncConfig> => {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
    });
    const m = new Map(rows.map((r) => [r.key, r.value]));
    return {
      enabled: toBool(m.get('credential_sync_enabled'), DEFAULTS.enabled),
      cron: m.get('credential_sync_cron')?.trim() || DEFAULTS.cron,
      staleInterimMinutes: Math.max(
        1,
        toInt(m.get('credential_sync_stale_interim_minutes'), DEFAULTS.staleInterimMinutes),
      ),
      maxOpenHours: Math.max(
        1,
        toInt(m.get('credential_sync_max_open_hours'), DEFAULTS.maxOpenHours),
      ),
    };
  } catch (err) {
    logger.warn('[credential-sync] Failed to load AppSetting; using defaults', { err });
    return { ...DEFAULTS };
  }
};

/**
 * Close orphan START/INTERIM RADIUS sessions so remaining-time math stays accurate
 * and Simultaneous-Use slots free up after NAS power loss.
 */
async function closeStaleRadiusSessions(cfg: CredentialSyncConfig): Promise<number> {
  const result = await prisma.$executeRaw`
    UPDATE wf_radius_session
    SET
      status = 'STOP',
      stopped_at = COALESCE(stopped_at, CURRENT_TIMESTAMP),
      terminate_cause = COALESCE(NULLIF(terminate_cause, ''), 'Cleanup-Timeout'),
      "sessionTimeSec" = GREATEST(
        COALESCE("sessionTimeSec", 0),
        GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)))::integer)
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE stopped_at IS NULL
      AND status IN ('START', 'INTERIM')
      AND (
        started_at < CURRENT_TIMESTAMP - (${cfg.maxOpenHours} * INTERVAL '1 hour')
        OR COALESCE(last_interim_at, started_at) <
          CURRENT_TIMESTAMP - (${cfg.staleInterimMinutes} * INTERVAL '1 minute')
      )
  `;
  return Number(result);
}

/** Calendar window ended → EXPIRED (takes precedence over CONSUMED). */
async function markExpiredCredentials(): Promise<number> {
  const result = await prisma.$executeRaw`
    UPDATE wf_credential
    SET
      status = 'EXPIRED'::"CredentialStatus",
      updated_at = CURRENT_TIMESTAMP
    WHERE deleted_at IS NULL
      AND revoked_at IS NULL
      AND status IN (
        'SOLD'::"CredentialStatus",
        'ACTIVATED'::"CredentialStatus",
        'PAUSED'::"CredentialStatus"
      )
      AND expires_at IS NOT NULL
      AND expires_at < CURRENT_TIMESTAMP
  `;
  return Number(result);
}

/**
 * Recompute remaining seconds from RADIUS usage and mark CONSUMED when
 * remaining ≤ 0 (or SINGLE_SESSION activation window exceeded).
 */
async function syncRemainingAndConsume(): Promise<number> {
  const result = await prisma.$executeRaw`
    WITH computed AS (
      SELECT
        c.id,
        rem.remaining_sec,
        rem.should_consume
      FROM wf_credential c
      INNER JOIN wf_plan p
        ON p.id = c.plan_id
        AND p.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(
          CASE
            WHEN COALESCE(rs."sessionTimeSec", 0) > w.wall + 120
              AND COALESCE(rs."sessionTimeSec", 0) > w.wall * 2
            THEN w.wall
            ELSE GREATEST(COALESCE(rs."sessionTimeSec", 0), w.wall)
          END
        ), 0)::integer AS used_sec
        FROM wf_radius_session rs
        CROSS JOIN LATERAL (
          SELECT GREATEST(
            0,
            FLOOR(EXTRACT(EPOCH FROM (
              COALESCE(rs.stopped_at, CURRENT_TIMESTAMP) - rs.started_at
            )))::integer
          ) AS wall
        ) w
        WHERE (
          rs.credential_id = c.id
          OR (
            rs.credential_id IS NULL
            AND (
              (c.username IS NOT NULL AND rs.user_name = c.username)
              OR (c.token IS NOT NULL AND (rs.user_name = c.token OR rs.user_name = UPPER(c.token)))
            )
          )
        )
        AND (
          p.time_usage_mode::text IS DISTINCT FROM 'SINGLE_SESSION'
          OR rs.started_at >= COALESCE(
            c.single_session_reseller_unlock_at,
            c.activated_at,
            c.sold_at,
            '-infinity'::timestamptz
          )
        )
      ) used ON true
      CROSS JOIN LATERAL (
        SELECT
          CASE
            WHEN COALESCE(p.time_amount, 0) > 0 AND p.time_unit IS NOT NULL THEN
              (p.time_amount *
                CASE p.time_unit
                  WHEN 'MINUTE' THEN 60
                  WHEN 'HOUR' THEN 3600
                  WHEN 'DAY' THEN 86400
                  WHEN 'MONTH' THEN 2592000
                  ELSE 0
                END)
            ELSE NULL
          END AS quota_sec
      ) q
      CROSS JOIN LATERAL (
        SELECT
          CASE
            WHEN q.quota_sec IS NULL THEN NULL
            ELSE GREATEST(0, q.quota_sec - COALESCE(used.used_sec, 0))
          END::integer AS remaining_sec,
          CASE
            WHEN q.quota_sec IS NULL THEN false
            WHEN COALESCE(used.used_sec, 0) >= q.quota_sec THEN true
            WHEN p.time_usage_mode::text = 'SINGLE_SESSION'
              AND c.activated_at IS NOT NULL
              AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.activated_at)) >= q.quota_sec
            THEN true
            ELSE false
          END AS should_consume
      ) rem
      WHERE c.deleted_at IS NULL
        AND c.revoked_at IS NULL
        AND c.status IN (
          'SOLD'::"CredentialStatus",
          'ACTIVATED'::"CredentialStatus",
          'PAUSED'::"CredentialStatus"
        )
        AND q.quota_sec IS NOT NULL
        AND (
          rem.should_consume
          OR c."timeRemainingSec" IS DISTINCT FROM rem.remaining_sec
        )
    )
    UPDATE wf_credential c
    SET
      "timeRemainingSec" = computed.remaining_sec,
      status = CASE
        WHEN computed.should_consume THEN 'CONSUMED'::"CredentialStatus"
        ELSE c.status
      END,
      updated_at = CURRENT_TIMESTAMP
    FROM computed
    WHERE c.id = computed.id
  `;
  return Number(result);
}

let scheduled: ScheduledTask | null = null;
let activeCron: string | null = null;
let running = false;

export type CredentialSyncTickResult = {
  staleRadiusClosed: number;
  expired: number;
  remainingSynced: number;
};

export async function runCredentialSyncTick(): Promise<CredentialSyncTickResult> {
  if (running) {
    logger.warn('[credential-sync] Previous run still in progress; skipping');
    return { staleRadiusClosed: 0, expired: 0, remainingSynced: 0 };
  }
  running = true;
  const startedAt = Date.now();

  try {
    const cfg = await loadConfig();
    if (!cfg.enabled) {
      logger.info('[credential-sync] Disabled by AppSetting');
      return { staleRadiusClosed: 0, expired: 0, remainingSynced: 0 };
    }

    const staleRadiusClosed = await closeStaleRadiusSessions(cfg);
    const expired = await markExpiredCredentials();
    const remainingSynced = await syncRemainingAndConsume();

    logger.info(
      `[credential-sync] Tick done in ${Date.now() - startedAt}ms (staleRadius=${staleRadiusClosed}, expired=${expired}, remainingSynced=${remainingSynced})`,
    );

    return { staleRadiusClosed, expired, remainingSynced };
  } catch (err) {
    logger.error('[credential-sync] Tick failed', { err });
    throw err;
  } finally {
    running = false;
  }
}

const scheduleJob = (expression: string) => {
  if (!cron.validate(expression)) {
    logger.warn(
      `[credential-sync] Invalid cron "${expression}"; using "${DEFAULTS.cron}"`,
    );
    expression = DEFAULTS.cron;
  }
  scheduled?.stop();
  scheduled = cron.schedule(
    expression,
    () => {
      void runCredentialSyncTick().catch((err) => {
        logger.error('[credential-sync] Unhandled tick error', { err });
      });
    },
    { timezone: APP_TIMEZONE },
  );
  activeCron = expression;
};

const rescheduleIfChanged = async () => {
  try {
    const cfg = await loadConfig();
    if (cfg.cron === activeCron) return;
    if (!cron.validate(cfg.cron)) {
      logger.warn(`[credential-sync] Ignoring invalid cron change "${cfg.cron}"`);
      return;
    }
    scheduleJob(cfg.cron);
    logger.info(`[credential-sync] Re-scheduled with "${cfg.cron}"`);
  } catch (err) {
    logger.warn('[credential-sync] Reschedule check failed', { err });
  }
};

export const startCredentialSyncJob = async (): Promise<ScheduledTask> => {
  const cfg = await loadConfig();
  scheduleJob(cfg.cron);
  logger.info(
    `[credential-sync] Scheduled with "${cfg.cron}" (enabled=${cfg.enabled}, staleInterim=${cfg.staleInterimMinutes}m, maxOpen=${cfg.maxOpenHours}h)`,
  );

  cron.schedule(
    '0 * * * *',
    () => {
      void rescheduleIfChanged();
    },
    { timezone: APP_TIMEZONE },
  );

  // Catch up immediately on boot (stuck ACTIVATED after RADIUS STOP gaps).
  void runCredentialSyncTick().catch((err) => {
    logger.error('[credential-sync] Boot tick failed', { err });
  });

  return scheduled!;
};
