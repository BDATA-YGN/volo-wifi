import type { Pool } from 'pg';

/**
 * Batch upsert via multi-row INSERT ... ON CONFLICT (id) DO UPDATE.
 * `columns` must match the physical NEW table column names.
 * Each row is an array aligned with `columns`.
 */
export async function bulkUpsertById(
  pool: Pool,
  table: string,
  columns: string[],
  rows: unknown[][],
  updateColumns: string[],
): Promise<{ inserted: number; updated: number }> {
  if (!rows.length) return { inserted: 0, updated: 0 };
  if (!columns.includes('id')) {
    throw new Error(`bulkUpsertById(${table}): columns must include id`);
  }

  const quotedTable = quoteIdent(table);
  const quotedCols = columns.map(quoteIdent).join(', ');
  const values: unknown[] = [];
  const valueSql: string[] = [];

  rows.forEach((row, rowIndex) => {
    if (row.length !== columns.length) {
      throw new Error(
        `bulkUpsertById(${table}): row ${rowIndex} length ${row.length} != columns ${columns.length}`,
      );
    }
    const placeholders: string[] = [];
    row.forEach((cell) => {
      values.push(cell);
      placeholders.push(`$${values.length}`);
    });
    valueSql.push(`(${placeholders.join(', ')})`);
  });

  const updateSql =
    updateColumns.length > 0
      ? updateColumns.map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`).join(', ')
      : `${quoteIdent(columns[1] ?? 'id')} = EXCLUDED.${quoteIdent(columns[1] ?? 'id')}`;

  // xmax = 0 means the row was inserted (not an update of an existing heap tuple).
  const sql = `
    WITH upserted AS (
      INSERT INTO ${quotedTable} (${quotedCols})
      VALUES ${valueSql.join(',\n')}
      ON CONFLICT (id) DO UPDATE SET ${updateSql}
      RETURNING (xmax = 0) AS inserted
    )
    SELECT
      COUNT(*) FILTER (WHERE inserted)::int AS inserted,
      COUNT(*) FILTER (WHERE NOT inserted)::int AS updated
    FROM upserted
  `;

  const result = await pool.query<{ inserted: number; updated: number }>(sql, values);
  return {
    inserted: Number(result.rows[0]?.inserted ?? 0),
    updated: Number(result.rows[0]?.updated ?? 0),
  };
}

export function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

export function asDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function asString(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

export function asBool(value: unknown, fallback = false): boolean {
  if (value == null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const s = String(value).toLowerCase();
  if (s === 'true' || s === 't' || s === '1') return true;
  if (s === 'false' || s === 'f' || s === '0') return false;
  return fallback;
}

export function asInt(value: unknown, fallback: number | null = null): number | null {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function asDecimalString(value: unknown, fallback = '0'): string {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : fallback;
}

export function parseStationIdsJson(value: unknown): string[] {
  if (value == null) return [];
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((v) => String(v)).filter(Boolean);
}
