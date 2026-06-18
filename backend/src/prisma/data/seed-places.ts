import * as fs from 'fs';
import * as path from 'path';
import type { PrismaClient } from '@/generated/prisma/client';
import { resolveRegionCsvPath, seedPlacesFromRegionCsv } from './places/seed-places-from-region-csv';

const PLACES_DIR = path.resolve(__dirname, 'places');

/** Seed all `*.csv` files under `src/prisma/data/places/`, then `docs/region.csv` if present. */
export async function seedAllPlaces(
  prisma: PrismaClient,
): Promise<{ files: number; inserted: number; skipped: number }> {
  const csvFiles: string[] = [];

  if (fs.existsSync(PLACES_DIR)) {
    for (const name of fs.readdirSync(PLACES_DIR)) {
      if (name.endsWith('.csv')) {
        csvFiles.push(path.join(PLACES_DIR, name));
      }
    }
  }

  const regionCsv = resolveRegionCsvPath();
  if (fs.existsSync(regionCsv) && !csvFiles.includes(regionCsv)) {
    csvFiles.push(regionCsv);
  }

  let inserted = 0;
  let skipped = 0;
  let files = 0;

  for (const csvPath of csvFiles) {
    try {
      const result = await seedPlacesFromRegionCsv(prisma, { csvPath });
      inserted += result.inserted;
      skipped += result.skipped;
      files += 1;
      console.log(`[places] ${path.basename(csvPath)} — inserted=${result.inserted}, skipped=${result.skipped}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[places] Skipped ${path.basename(csvPath)}: ${message}`);
    }
  }

  return { files, inserted, skipped };
}
