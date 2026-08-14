import type { PrismaClient } from '@/generated/prisma/client';

const toBool = (v: string | undefined, fallback: boolean) =>
  v === undefined ? fallback : ['true', '1', 'yes'].includes(v.toLowerCase());

const toInt = (v: string | undefined, fallback: number, min = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : fallback;
};

export type ReportingAggregateSettings = {
  enabled: boolean;
  cron: string;
  lookbackDays: number;
  backfillDays: number;
  backfillBatch: number;
  rollupEnabled: boolean;
  rollupCron: string;
  batchSize: number;
};

export const AGGREGATE_DEFAULTS: ReportingAggregateSettings = {
  enabled: true,
  cron: '15 * * * *',
  lookbackDays: 3,
  backfillDays: 90,
  backfillBatch: 14,
  rollupEnabled: true,
  rollupCron: '30 2 1 * *',
  batchSize: 2000,
};

export async function loadReportingAggregateSettings(
  prisma: PrismaClient
): Promise<ReportingAggregateSettings> {
  const keys = [
    'reporting_aggregate_enabled',
    'reporting_aggregate_cron',
    'reporting_aggregate_lookback_days',
    'reporting_aggregate_backfill_days',
    'reporting_aggregate_backfill_batch',
    'reporting_rollup_enabled',
    'reporting_rollup_cron',
    'ops_archive_batch_size',
  ];
  const rows = await prisma.appSetting.findMany({ where: { key: { in: keys } } });
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const batch = Math.max(100, toInt(m.get('ops_archive_batch_size'), AGGREGATE_DEFAULTS.batchSize));
  return {
    enabled: toBool(m.get('reporting_aggregate_enabled'), AGGREGATE_DEFAULTS.enabled),
    cron: m.get('reporting_aggregate_cron')?.trim() || AGGREGATE_DEFAULTS.cron,
    lookbackDays: Math.max(1, toInt(m.get('reporting_aggregate_lookback_days'), AGGREGATE_DEFAULTS.lookbackDays, 1)),
    backfillDays: Math.max(
      1,
      toInt(m.get('reporting_aggregate_backfill_days'), AGGREGATE_DEFAULTS.backfillDays, 1)
    ),
    backfillBatch: Math.max(
      1,
      toInt(m.get('reporting_aggregate_backfill_batch'), AGGREGATE_DEFAULTS.backfillBatch, 1)
    ),
    rollupEnabled: toBool(m.get('reporting_rollup_enabled'), AGGREGATE_DEFAULTS.rollupEnabled),
    rollupCron: m.get('reporting_rollup_cron')?.trim() || AGGREGATE_DEFAULTS.rollupCron,
    batchSize: batch,
  };
}
