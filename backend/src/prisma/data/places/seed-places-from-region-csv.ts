import * as fs from 'fs';
import * as path from 'path';
import type { PrismaClient } from '@/generated/prisma/client';

const BATCH_SIZE = 500;

export type RegionCsvRow = {
  region: string;
  town: string;
  ward: string;
};

const trim = (v: string) => v.trim();

const placeKey = (region: string, town: string, ward: string) =>
  `${region.toLowerCase()}|${town.toLowerCase()}|${ward.toLowerCase()}`;

/** Default CSV path: repo root `docs/region.csv` */
export function resolveRegionCsvPath(customPath?: string): string {
  if (customPath) return path.resolve(customPath);
  return path.resolve(__dirname, '../../../../../docs/region.csv');
}

export function parseRegionCsv(filePath: string): RegionCsvRow[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const rows: RegionCsvRow[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 4) continue;

    const region = trim(parts[0]);
    const town = trim(parts[1]);
    const ward = trim(parts[2]);

    if (!region && !town && !ward) continue;

    const key = placeKey(region, town, ward);
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({ region, town, ward });
  }

  return rows;
}

type PlaceSeedRow = {
  region: string | null;
  town: string | null;
  ward: string | null;
  postcode: null;
};

function toPlaceRow(row: RegionCsvRow): PlaceSeedRow {
  const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s);
  return {
    region: row.region ? clip(row.region, 300) : null,
    town: row.town ? clip(row.town, 300) : null,
    ward: row.ward ? clip(row.ward, 300) : null,
    postcode: null,
  };
}

/**
 * Import `docs/region.csv` into `tbl_places` (region, town, ward from Ward_Name_Eng).
 * Skips rows that already exist (same region + town + ward, case-insensitive).
 */
export async function seedPlacesFromRegionCsv(
  prisma: PrismaClient,
  options: { csvPath?: string; dryRun?: boolean } = {},
): Promise<{ parsed: number; inserted: number; skipped: number }> {
  const csvPath = resolveRegionCsvPath(options.csvPath);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`region.csv not found at ${csvPath}`);
  }

  const parsedRows = parseRegionCsv(csvPath);
  console.log(`[places] Parsed ${parsedRows.length} unique rows from ${csvPath}`);

  const existing = await prisma.places.findMany({
    where: { deletedAt: null },
    select: { region: true, town: true, ward: true },
  });

  const existingKeys = new Set(
    existing.map((p) =>
      placeKey(trim(p.region ?? ''), trim(p.town ?? ''), trim(p.ward ?? '')),
    ),
  );

  const toInsert = parsedRows.filter((r) => !existingKeys.has(placeKey(r.region, r.town, r.ward)));
  const skipped = parsedRows.length - toInsert.length;

  console.log(`[places] Existing active places: ${existing.length}, to insert: ${toInsert.length}, skipped: ${skipped}`);

  if (options.dryRun) {
    return { parsed: parsedRows.length, inserted: 0, skipped };
  }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE).map(toPlaceRow);
    const result = await prisma.places.createMany({ data: batch });
    inserted += result.count;
    console.log(`[places] Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.count} rows`);
  }

  console.log(`[places] Done. Inserted ${inserted} rows into tbl_places.`);
  return { parsed: parsedRows.length, inserted, skipped };
}
