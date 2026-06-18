import type { PrismaClient } from '@/generated/prisma/client';

const toBool = (v: string | undefined, fallback: boolean) =>
  v === undefined ? fallback : ['true', '1', 'yes'].includes(v.toLowerCase());

const toInt = (v: string | undefined, fallback: number, min = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : fallback;
};

/** Per-entity operational retention — all values in days unless noted. */
export type OpsArchiveSettings = {
  enabled: boolean;
  cron: string;
  batchSize: number;

  /** EXPIRED / CONSUMED / REVOKED credentials — grace after terminal date before archive. */
  credentialGraceDays: number;
  credentialArchiveRetentionDays: number;

  /** Captive portal rows — hot purge only (no archive table). */
  captivePortalRetentionDays: number;

  /** Stopped RADIUS sessions — hot retention before move to archive. */
  radiusSessionHotRetentionDays: number;
  radiusSessionArchiveRetentionDays: number;

  /** PAID / VOID / REFUNDED orders — hot retention before archive snapshot. */
  saleOrderHotRetentionDays: number;
  saleOrderDraftRetentionDays: number;
  saleOrderArchiveRetentionDays: number;

  /** Pre-aggregated stat tables — hard purge only (not operational). */
  reportingStatsRetentionDays: number;
};

export const OPS_ARCHIVE_DEFAULTS: OpsArchiveSettings = {
  enabled: true,
  cron: '30 4 * * *',
  batchSize: 500,

  credentialGraceDays: 7,
  credentialArchiveRetentionDays: 2555,

  captivePortalRetentionDays: 14,

  radiusSessionHotRetentionDays: 30,
  radiusSessionArchiveRetentionDays: 730,

  saleOrderHotRetentionDays: 180,
  saleOrderDraftRetentionDays: 30,
  saleOrderArchiveRetentionDays: 2555,

  reportingStatsRetentionDays: 1095,
};

const SETTING_KEYS = [
  'ops_archive_enabled',
  'ops_archive_cron',
  'ops_archive_batch_size',
  'credential_archive_grace_days',
  'credential_archive_retention_days',
  'captive_portal_retention_days',
  'radius_session_hot_retention_days',
  'radius_session_archive_retention_days',
  'sale_order_hot_retention_days',
  'sale_order_draft_retention_days',
  'sale_order_archive_retention_days',
  'reporting_stats_retention_days',
] as const;

export async function loadOpsArchiveSettings(prisma: PrismaClient): Promise<OpsArchiveSettings> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: [...SETTING_KEYS] } },
  });
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const batch = Math.max(50, toInt(m.get('ops_archive_batch_size'), OPS_ARCHIVE_DEFAULTS.batchSize, 50));

  return {
    enabled: toBool(m.get('ops_archive_enabled'), OPS_ARCHIVE_DEFAULTS.enabled),
    cron: m.get('ops_archive_cron')?.trim() || OPS_ARCHIVE_DEFAULTS.cron,
    batchSize: batch,
    credentialGraceDays: Math.max(
      1,
      toInt(m.get('credential_archive_grace_days'), OPS_ARCHIVE_DEFAULTS.credentialGraceDays, 1)
    ),
    credentialArchiveRetentionDays: toInt(
      m.get('credential_archive_retention_days'),
      OPS_ARCHIVE_DEFAULTS.credentialArchiveRetentionDays
    ),
    captivePortalRetentionDays: Math.max(
      1,
      toInt(m.get('captive_portal_retention_days'), OPS_ARCHIVE_DEFAULTS.captivePortalRetentionDays, 1)
    ),
    radiusSessionHotRetentionDays: Math.max(
      7,
      toInt(m.get('radius_session_hot_retention_days'), OPS_ARCHIVE_DEFAULTS.radiusSessionHotRetentionDays, 7)
    ),
    radiusSessionArchiveRetentionDays: toInt(
      m.get('radius_session_archive_retention_days'),
      OPS_ARCHIVE_DEFAULTS.radiusSessionArchiveRetentionDays
    ),
    saleOrderHotRetentionDays: Math.max(
      30,
      toInt(m.get('sale_order_hot_retention_days'), OPS_ARCHIVE_DEFAULTS.saleOrderHotRetentionDays, 30)
    ),
    saleOrderDraftRetentionDays: Math.max(
      7,
      toInt(m.get('sale_order_draft_retention_days'), OPS_ARCHIVE_DEFAULTS.saleOrderDraftRetentionDays, 7)
    ),
    saleOrderArchiveRetentionDays: toInt(
      m.get('sale_order_archive_retention_days'),
      OPS_ARCHIVE_DEFAULTS.saleOrderArchiveRetentionDays
    ),
    reportingStatsRetentionDays: toInt(
      m.get('reporting_stats_retention_days'),
      OPS_ARCHIVE_DEFAULTS.reportingStatsRetentionDays
    ),
  };
}
