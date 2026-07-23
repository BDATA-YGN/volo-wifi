#!/usr/bin/env node
/**
 * Backup + consolidate per-site retail price books into:
 *   - 1 org DEFAULT price book (modal prices)
 *   - wf_station_plan_offer rows (site sellable plans)
 *   - keep site override books only when prices differ from default
 *
 * Usage (from backend/):
 *   yarn data:retail-pricing:backup -- --org=AA
 *   yarn data:retail-pricing:consolidate -- --org=AA
 *   yarn data:retail-pricing:consolidate -- --org=AA --apply --i-understand
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool } from 'pg';
import { DATABASE_URL } from '@/config';
import { buildPgPoolConfig } from '@/lib/pg-ssl';

type Mode = 'backup' | 'consolidate';

function parseArgs(argv: string[]) {
  let mode: Mode = 'consolidate';
  let orgCode: string | undefined;
  let apply = false;
  let confirmed = false;
  for (const arg of argv) {
    if (arg === 'backup' || arg.startsWith('--mode=backup')) mode = 'backup';
    if (arg === 'consolidate' || arg.startsWith('--mode=consolidate')) mode = 'consolidate';
    if (arg === '--apply') apply = true;
    if (arg === '--i-understand') confirmed = true;
    if (arg.startsWith('--org=')) orgCode = arg.slice('--org='.length).trim() || undefined;
  }
  // yarn script name routing
  if (argv.some((a) => a.includes('backup')) && !argv.some((a) => a.includes('consolidate'))) {
    mode = 'backup';
  }
  return { mode, orgCode, apply, confirmed };
}

async function resolveOrg(pool: Pool, orgCode?: string) {
  if (!orgCode) throw new Error('--org=CODE is required');
  const { rows } = await pool.query<{ id: string; code: string; name: string }>(
    `SELECT id, code, name FROM wf_org WHERE code = $1 AND deleted_at IS NULL LIMIT 1`,
    [orgCode]
  );
  if (!rows[0]) throw new Error(`Org not found: ${orgCode}`);
  return rows[0];
}

async function exportBackup(pool: Pool, orgId: string, orgCode: string) {
  const books = await pool.query(`SELECT * FROM wf_plan_price_book WHERE org_id = $1`, [orgId]);
  const prices = await pool.query(`SELECT * FROM wf_plan_price WHERE org_id = $1`, [orgId]);
  const payload = {
    exportedAt: new Date().toISOString(),
    org: { id: orgId, code: orgCode },
    books: books.rows,
    prices: prices.rows,
  };
  const dir = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `retail-pricing-backup-${orgCode}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return { file, bookCount: books.rowCount ?? 0, priceCount: prices.rowCount ?? 0 };
}

function modalPrice(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0];
}

async function consolidate(pool: Pool, orgId: string, orgCode: string, apply: boolean) {
  const backup = await exportBackup(pool, orgId, orgCode);
  console.log(`Backup: ${backup.file} (${backup.bookCount} books, ${backup.priceCount} prices)`);

  const siteBooks = await pool.query<{
    id: string;
    name: string;
  }>(
    `SELECT DISTINCT b.id, b.name
     FROM wf_plan_price_book b
     JOIN wf_plan_price_book_station link ON link.price_book_id = b.id
     WHERE b.org_id = $1 AND b.deleted_at IS NULL`,
    [orgId]
  );

  const stationLinks = await pool.query<{
    price_book_id: string;
    station_id: string;
  }>(
    `SELECT link.price_book_id, link.station_id
     FROM wf_plan_price_book_station link
     JOIN wf_plan_price_book b ON b.id = link.price_book_id
     WHERE b.org_id = $1 AND b.deleted_at IS NULL`,
    [orgId]
  );

  const priceRows = await pool.query<{
    price_book_id: string;
    plan_id: string;
    plan_code: string;
    retail_price: string;
    cost_price: string | null;
    is_active: boolean;
  }>(
    `SELECT p.price_book_id, p.plan_id, pl.code AS plan_code,
            p.retail_price::text AS retail_price,
            p.cost_price::text AS cost_price,
            p.is_active
     FROM wf_plan_price p
     JOIN wf_plan pl ON pl.id = p.plan_id
     JOIN wf_plan_price_book b ON b.id = p.price_book_id
     WHERE p.org_id = $1 AND p.deleted_at IS NULL AND b.deleted_at IS NULL
       AND EXISTS (
         SELECT 1 FROM wf_plan_price_book_station s WHERE s.price_book_id = b.id
       )`,
    [orgId]
  );

  const byPlan = new Map<string, { planId: string; retails: string[]; costs: (string | null)[] }>();
  for (const row of priceRows.rows) {
    const cur = byPlan.get(row.plan_code) ?? { planId: row.plan_id, retails: [], costs: [] };
    cur.retails.push(row.retail_price);
    cur.costs.push(row.cost_price);
    byPlan.set(row.plan_code, cur);
  }

  const defaultPrices = [...byPlan.entries()].map(([code, data]) => {
    const retail = modalPrice(data.retails);
    const nonNullCosts = data.costs.filter((c): c is string => c != null && String(c).trim() !== '');
    // Prefer null when most rows have no cost; otherwise modal among non-null costs.
    const cost =
      nonNullCosts.length * 2 >= data.costs.length ? modalPrice(nonNullCosts) : null;
    return { code, planId: data.planId, retail, cost };
  });

  console.log('Proposed DEFAULT prices:');
  console.table(defaultPrices.map((p) => ({ code: p.code, retail: p.retail, cost: p.cost ?? '—' })));

  const pricesByBook = new Map<string, typeof priceRows.rows>();
  for (const row of priceRows.rows) {
    const list = pricesByBook.get(row.price_book_id) ?? [];
    list.push(row);
    pricesByBook.set(row.price_book_id, list);
  }

  const defaultByPlanId = new Map(defaultPrices.map((p) => [p.planId, p]));
  const stationsByBook = new Map<string, string[]>();
  for (const link of stationLinks.rows) {
    const list = stationsByBook.get(link.price_book_id) ?? [];
    list.push(link.station_id);
    stationsByBook.set(link.price_book_id, list);
  }

  const offers: { stationId: string; planId: string }[] = [];
  const keepOverrideBookIds: string[] = [];
  const softDeleteBookIds: string[] = [];

  for (const book of siteBooks.rows) {
    const rows = pricesByBook.get(book.id) ?? [];
    const stationIds = stationsByBook.get(book.id) ?? [];
    for (const stationId of stationIds) {
      for (const row of rows) {
        offers.push({ stationId, planId: row.plan_id });
      }
    }
    // Keep site book only when retail amounts differ from org default (catalog subset alone → offers).
    const differs = rows.some((row) => {
      const def = defaultByPlanId.get(row.plan_id);
      if (!def) return true;
      return Number(row.retail_price) !== Number(def.retail);
    });
    if (differs) keepOverrideBookIds.push(book.id);
    else softDeleteBookIds.push(book.id);
  }

  // Deduplicate offers
  const offerKey = new Set<string>();
  const uniqueOffers = offers.filter((o) => {
    const k = `${o.stationId}:${o.planId}`;
    if (offerKey.has(k)) return false;
    offerKey.add(k);
    return true;
  });

  console.log(
    `Site books: ${siteBooks.rowCount} → soft-delete ${softDeleteBookIds.length}, keep overrides ${keepOverrideBookIds.length}`
  );
  console.log(`Station plan offers to upsert: ${uniqueOffers.length}`);

  if (!apply) {
    console.log('Dry-run only. Re-run with --apply --i-understand to write.');
    return { backup: backup.file, dryRun: true };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure single default book
    let defaultBookId: string;
    const existingDefault = await client.query<{ id: string }>(
      `SELECT id FROM wf_plan_price_book b
       WHERE org_id = $1 AND deleted_at IS NULL AND station_size_id IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM wf_plan_price_book_station s WHERE s.price_book_id = b.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM wf_plan_price_book_reseller r WHERE r.price_book_id = b.id
         )
       ORDER BY is_default DESC, created_at ASC
       LIMIT 1`,
      [orgId]
    );
    if (existingDefault.rows[0]) {
      defaultBookId = existingDefault.rows[0].id;
      await client.query(
        `UPDATE wf_plan_price_book
         SET name = $2, is_default = true, updated_at = NOW()
         WHERE id = $1`,
        [defaultBookId, `${orgCode} Standard Retail`]
      );
    } else {
      defaultBookId = crypto.randomUUID();
      await client.query(
        `INSERT INTO wf_plan_price_book
           (id, org_id, name, is_default, station_size_id, created_at, updated_at)
         VALUES ($1,$2,$3,true,NULL,NOW(),NOW())`,
        [defaultBookId, orgId, `${orgCode} Standard Retail`]
      );
    }

    for (const p of defaultPrices) {
      await client.query(
        `INSERT INTO wf_plan_price
           (id, org_id, price_book_id, plan_id, retail_price, cost_price, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5::numeric,$6::numeric,true,NOW(),NOW())
         ON CONFLICT (price_book_id, plan_id)
         DO UPDATE SET
           retail_price = EXCLUDED.retail_price,
           cost_price = EXCLUDED.cost_price,
           is_active = true,
           updated_at = NOW(),
           deleted_at = NULL`,
        [
          crypto.randomUUID(),
          orgId,
          defaultBookId,
          p.planId,
          p.retail,
          p.cost,
        ]
      );
    }

    for (const offer of uniqueOffers) {
      await client.query(
        `INSERT INTO wf_station_plan_offer (id, org_id, station_id, plan_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,NOW(),NOW())
         ON CONFLICT (station_id, plan_id) DO UPDATE SET updated_at = NOW()`,
        [crypto.randomUUID(), orgId, offer.stationId, offer.planId]
      );
    }

    if (softDeleteBookIds.length) {
      await client.query(
        `UPDATE wf_plan_price_book SET deleted_at = NOW(), updated_at = NOW(), is_default = false
         WHERE id = ANY($1::text[])`,
        [softDeleteBookIds]
      );
      await client.query(
        `UPDATE wf_plan_price SET deleted_at = NOW(), updated_at = NOW()
         WHERE price_book_id = ANY($1::text[]) AND deleted_at IS NULL`,
        [softDeleteBookIds]
      );
    }

    // Clear is_default on remaining site books
    await client.query(
      `UPDATE wf_plan_price_book b SET is_default = false, updated_at = NOW()
       WHERE org_id = $1 AND deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM wf_plan_price_book_station s WHERE s.price_book_id = b.id
         )`,
      [orgId]
    );

    await client.query('COMMIT');
    console.log(`Applied. Default book id=${defaultBookId}`);
    return { backup: backup.file, dryRun: false, defaultBookId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (args.apply && !args.confirmed) {
    throw new Error('Refusing --apply without --i-understand');
  }

  const pool = new Pool(buildPgPoolConfig(DATABASE_URL));
  try {
    const org = await resolveOrg(pool, args.orgCode);
    console.log(`Org ${org.code} (${org.name})`);

    // Ensure new tables/columns exist (idempotent migration SQL already applied in deploy)
    await pool.query(`SELECT 1 FROM wf_station_plan_offer LIMIT 0`).catch(() => {
      throw new Error(
        'wf_station_plan_offer missing — apply migration 20260722050000_station_plan_offer_tier_pricebook first'
      );
    });

    if (args.mode === 'backup') {
      const backup = await exportBackup(pool, org.id, org.code);
      console.log(`Wrote ${backup.file}`);
      return;
    }

    await consolidate(pool, org.id, org.code, args.apply);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
