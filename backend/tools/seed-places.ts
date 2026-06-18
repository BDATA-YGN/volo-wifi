#!/usr/bin/env ts-node
/**
 * Seed tbl_places from CSV files.
 * Usage:
 *   yarn seed:places
 *   yarn seed:places -- --csv backend/src/prisma/data/places/rakhine-places.csv
 *   yarn seed:places -- --dryRun
 */
import PrismaDBConnection from '@/prisma/prisma-client';
import {
  resolveRegionCsvPath,
  seedPlacesFromRegionCsv,
} from '@/prisma/data/places/seed-places-from-region-csv';
import path from 'path';

const prisma = PrismaDBConnection.getConnection();

const defaultCsvFiles = [
  path.resolve(__dirname, '../src/prisma/data/places/rakhine-places.csv'),
  resolveRegionCsvPath(),
];

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dryRun') || args.includes('--dry-run');
  const csvArgIdx = args.findIndex((a) => a === '--csv');
  const csvFiles =
    csvArgIdx >= 0 && args[csvArgIdx + 1]
      ? [path.resolve(args[csvArgIdx + 1])]
      : defaultCsvFiles;

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const csvPath of csvFiles) {
    try {
      const result = await seedPlacesFromRegionCsv(prisma, { csvPath, dryRun });
      totalInserted += result.inserted;
      totalSkipped += result.skipped;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) {
        console.warn(`[places] Skipping missing CSV: ${csvPath}`);
        continue;
      }
      throw err;
    }
  }

  console.log(
    `[places] Finished. inserted=${totalInserted}, skipped=${totalSkipped}, dryRun=${dryRun}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
