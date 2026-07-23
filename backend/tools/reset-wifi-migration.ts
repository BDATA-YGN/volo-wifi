#!/usr/bin/env node
/**
 * Reset (hard-delete) migrated WiFi org data from the NEW database so migrate can re-run.
 *
 * Usage (from backend/):
 *   yarn data:wifi:migrate:reset -- --org=AA --i-understand
 *
 * Does NOT touch OLD_DATABASE_URL. Keeps platform seed admin (developer) and capacity tiers.
 */

import 'dotenv/config';
import PrismaDBConnection from '@/prisma/prisma-client';
import { clearWifiOrgByCode } from '@/prisma/data/migrate-from-volo/clear-org';

function parseArgs(argv: string[]): {
  orgCode?: string;
  confirmed: boolean;
  help: boolean;
} {
  let orgCode: string | undefined;
  let confirmed = false;
  let help = false;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') help = true;
    else if (arg === '--i-understand') confirmed = true;
    else if (arg.startsWith('--org=')) orgCode = arg.slice('--org='.length).trim() || undefined;
  }

  return { orgCode, confirmed, help };
}

function printHelp(): void {
  console.log(`Reset migrated WiFi org data on NEW database

Options:
  --org=CODE         Required org code to delete (e.g. AA)
  --i-understand     Confirm destructive delete
  -h, --help         Show help

Example:
  yarn data:wifi:migrate:reset -- --org=AA --i-understand
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.orgCode) {
    console.error('Missing --org=CODE. Example: yarn data:wifi:migrate:reset -- --org=AA --i-understand');
    process.exit(1);
  }

  if (!args.confirmed) {
    console.error(
      'Refusing reset without --i-understand.\n' +
        `  yarn data:wifi:migrate:reset -- --org=${args.orgCode} --i-understand`,
    );
    process.exit(1);
  }

  const prisma = PrismaDBConnection.getConnection();
  try {
    console.log(`Resetting migrated WiFi org ${args.orgCode} on NEW database…`);
    const result = await clearWifiOrgByCode(prisma, args.orgCode);
    console.log(
      `Cleared org ${result.orgCode} (${result.orgId}); removed ${result.deletedAdmins} orphan admin(s).`,
    );
    console.log('You can re-run: yarn data:wifi:migrate -- --apply --i-understand --phase=1 --org=' + args.orgCode);
  } finally {
    await PrismaDBConnection.disconnect();
  }
}

main().catch((err) => {
  console.error('Migration reset failed:', err);
  process.exit(1);
});
