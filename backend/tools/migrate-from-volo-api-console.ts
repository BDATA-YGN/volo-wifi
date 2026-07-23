#!/usr/bin/env node
/**
 * Migrate WiFi domain data from live volo-api-console PostgreSQL → volo-wifi.
 *
 * Phases (run and verify one at a time):
 *   1 foundation — admins, org, license, members, resellers, stations, plans
 *   2 inventory  — voucher batches, credentials
 *   3 commerce   — sales, payments, commissions
 *
 * Usage (from backend/):
 *   yarn data:wifi:migrate:dry -- --phase=1
 *   yarn data:wifi:migrate -- --apply --i-understand --phase=1
 *   yarn data:wifi:migrate -- --apply --i-understand --phase=2 --since=2026-07-22
 *
 * Env:
 *   OLD_DATABASE_URL          required — volo-api-console DATABASE_URL
 *   OLD_DATABASE_SSL_MODE     optional — defaults to DATABASE_SSL_MODE / auto
 *   DATABASE_URL              NEW target (existing app env)
 */

import 'dotenv/config';
import { Pool } from 'pg';
import PrismaDBConnection from '@/prisma/prisma-client';
import { DATABASE_URL } from '@/config';
import { buildPgPoolConfig } from '@/lib/pg-ssl';
import {
  runWifiLegacyMigration,
  PHASE_LABELS,
  type MigrateMode,
  type MigrateOptions,
  type MigratePhase,
} from '@/prisma/data/migrate-from-volo';

function parseSince(raw: string): Date {
  const trimmed = raw.trim();
  // YYYY-MM-DD → start of that UTC day
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid --since date: ${raw}`);
    return d;
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid --since value: ${raw}`);
  return d;
}

function parseArgs(argv: string[]): {
  mode: MigrateMode;
  phase?: MigratePhase;
  since?: Date;
  orgCode?: string;
  batchSize: number;
  reportPath?: string;
  confirmed: boolean;
  help: boolean;
} {
  let mode: MigrateMode = 'dry-run';
  let phase: MigratePhase | undefined;
  let since: Date | undefined;
  let orgCode: string | undefined;
  let batchSize = 500;
  let reportPath: string | undefined;
  let confirmed = false;
  let help = false;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') help = true;
    else if (arg === '--dry-run') mode = 'dry-run';
    else if (arg === '--apply') mode = 'apply';
    else if (arg === '--i-understand') confirmed = true;
    else if (arg.startsWith('--org=')) orgCode = arg.slice('--org='.length).trim() || undefined;
    else if (arg.startsWith('--phase=')) {
      const n = Number(arg.slice('--phase='.length));
      if (n !== 1 && n !== 2 && n !== 3) {
        throw new Error('--phase must be 1, 2, or 3');
      }
      phase = n;
    } else if (arg.startsWith('--since=')) {
      since = parseSince(arg.slice('--since='.length));
    } else if (arg.startsWith('--batch=')) {
      const n = Number(arg.slice('--batch='.length));
      if (Number.isFinite(n) && n >= 50 && n <= 5000) batchSize = Math.trunc(n);
    } else if (arg.startsWith('--report=')) {
      reportPath = arg.slice('--report='.length).trim() || undefined;
    }
  }

  return { mode, phase, since, orgCode, batchSize, reportPath, confirmed, help };
}

function printHelp(): void {
  console.log(`WiFi legacy DB migration (volo-api-console → volo-wifi)

Phases (verify each before continuing):
  1  ${PHASE_LABELS[1]}
  2  ${PHASE_LABELS[2]}
  3  ${PHASE_LABELS[3]}

Options:
  --dry-run              Read OLD only, write report (default)
  --apply                Write to NEW database (requires --i-understand)
  --i-understand         Confirm apply intent
  --phase=1|2|3          Run a single phase (omit = all phases)
  --since=YYYY-MM-DD     Delta: only rows with createdAt/updatedAt/(paidAt) >= since
  --org=CODE             Limit import to one org code
  --batch=N              Batch size (50–5000, default 500)
  --report=PATH          Report JSON output path
  -h, --help             Show help

Examples:
  yarn data:wifi:migrate:dry -- --phase=1 --org=AA
  yarn data:wifi:migrate -- --apply --i-understand --phase=1 --org=AA
  yarn data:wifi:migrate -- --apply --i-understand --phase=2 --org=AA
  yarn data:wifi:migrate -- --apply --i-understand --phase=3 --org=AA
  # weekly catch-up after a baseline:
  yarn data:wifi:migrate -- --apply --i-understand --phase=2 --since=2026-07-22
  yarn data:wifi:migrate -- --apply --i-understand --phase=3 --since=2026-07-22

Env:
  OLD_DATABASE_URL       Source (required)
  OLD_DATABASE_SSL_MODE  Optional SSL mode for source
  DATABASE_URL           Target (existing)
`);
}

async function main(): Promise<void> {
  let args: ReturnType<typeof parseArgs>;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
    return;
  }

  if (args.help) {
    printHelp();
    return;
  }

  if (args.mode === 'apply' && !args.confirmed) {
    console.error(
      'Refusing --apply without --i-understand. Run dry-run first, then:\n' +
        '  yarn data:wifi:migrate -- --apply --i-understand --phase=1',
    );
    process.exit(1);
  }

  if (!(process.env.OLD_DATABASE_URL || '').trim()) {
    console.error('OLD_DATABASE_URL is not set. Add it to backend/.env (volo-api-console DATABASE_URL).');
    process.exit(1);
  }

  const options: MigrateOptions = {
    mode: args.mode,
    phase: args.phase,
    since: args.since,
    orgCode: args.orgCode,
    batchSize: args.batchSize,
    reportPath: args.reportPath,
  };

  console.log(`Starting WiFi migration (${options.mode})…`);
  console.log(`  phase: ${options.phase ?? 'all (1→2→3)'}`);
  if (options.since) console.log(`  since: ${options.since.toISOString()}`);
  if (options.orgCode) console.log(`  org filter: ${options.orgCode}`);
  console.log(`  batch size: ${options.batchSize}`);

  const prisma = PrismaDBConnection.getConnection();
  const newPool = new Pool(buildPgPoolConfig(DATABASE_URL));

  try {
    const { report, reportPath } = await runWifiLegacyMigration(prisma, newPool, options);
    console.log('\nMigration finished.');
    console.log(`Report: ${reportPath}`);
    console.log('Stats:');
    for (const [entity, stats] of Object.entries(report.stats)) {
      console.log(
        `  ${entity}: source=${stats.source} +${stats.inserted} ~${stats.updated} skip=${stats.skipped} err=${stats.errors}`,
      );
    }
    if (options.phase && options.phase < 3) {
      console.log(`\nNext: verify phase ${options.phase}, then run --phase=${options.phase + 1}`);
    }
    const errors = report.issues.filter((i) => i.level === 'error');
    if (errors.length) {
      console.log(`\n${errors.length} error issue(s) (see report). First 5:`);
      for (const e of errors.slice(0, 5)) {
        console.log(`  [${e.entity}] ${e.message}`);
      }
      process.exitCode = 2;
    }
  } finally {
    await newPool.end();
    await PrismaDBConnection.disconnect();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
