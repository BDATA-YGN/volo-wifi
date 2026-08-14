#!/usr/bin/env node
/**
 * Rebuild rpt_daily_* stats for days that lag behind live orders/sessions.
 *
 * Usage (from backend/):
 *   npx ts-node -r tsconfig-paths/register ./tools/backfill-reporting-stats.ts
 *   npx ts-node -r tsconfig-paths/register ./tools/backfill-reporting-stats.ts --days=90
 */
import 'dotenv/config';
import PrismaDBConnection from '@/prisma/prisma-client';
import { addUtcDays, startOfUtcDay } from '@/jobs/reporting/lib/dates';
import { findDaysNeedingRebuild } from '@/jobs/reporting/lib/find-unaggregated-days';
import { aggregateDailySalesForDate } from '@/jobs/reporting/lib/aggregate-daily-sales';
import { aggregateDailyRadiusForDate } from '@/jobs/reporting/lib/aggregate-daily-radius';

const daysArg = process.argv.find((a) => a.startsWith('--days='));
const windowDays = Math.max(1, Number(daysArg?.slice('--days='.length) || 90) || 90);

async function main(): Promise<void> {
  const prisma = PrismaDBConnection.getConnection();
  const today = startOfUtcDay(new Date());
  const from = addUtcDays(today, -(windowDays - 1));
  const stale = await findDaysNeedingRebuild(prisma, from, today);
  console.log(`[backfill] ${stale.length} day(s) need rebuild in last ${windowDays}d`);

  let salesBuckets = 0;
  let radiusBuckets = 0;
  for (const [i, day] of stale.entries()) {
    const label = day.toISOString();
    process.stdout.write(`[backfill] ${i + 1}/${stale.length} ${label} ... `);
    salesBuckets += await aggregateDailySalesForDate(prisma, day);
    radiusBuckets += await aggregateDailyRadiusForDate(prisma, day);
    console.log('ok');
  }

  console.log(`[backfill] done salesBuckets=${salesBuckets} radiusBuckets=${radiusBuckets}`);
  process.exit(0);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
