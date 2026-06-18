import { Pool, QueryConfig, QueryResult } from 'pg';
import { logger } from '@/logging/logger';
import { DB_DATABASE, DB_HOST, DB_PASSWORD, DB_PORT, DB_USER } from '@/config';
import { resolvePgSsl } from '@/lib/pg-ssl';

const poolConfig: ConstructorParameters<typeof Pool>[0] = {
  host: DB_HOST || 'localhost',
  port: Number(DB_PORT) || 5432,
  user: DB_USER || 'postgres',
  password: DB_PASSWORD || '',
  database: DB_DATABASE || 'mydb',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const ssl = resolvePgSsl();
if (ssl) {
  poolConfig.ssl = ssl;
}

const pool = new Pool(poolConfig);

// connection test
pool
  .connect()
  .then(c => {
    logger.info('Connected to PostgreSQL');
    c.release();
  })
  .catch(err => logger.error('DB connection error:', err));

/* -------------------------------------------------------
   SAFE LOGGING WRAPPER — keeps all original overloads
------------------------------------------------------- */

function interpolateQuery(query: string, params: any[] = []) {
  return query.replace(/\$(\d+)/g, (_, num) => {
    const value = params[num - 1];

    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return `'${value.toISOString()}'`;

    // escape single quotes
    return `'${String(value).replace(/'/g, "''")}'`;
  });
}

if (process.env.NODE_ENV !== 'production') {
  const originalQuery = pool.query.bind(pool);

  (pool.query as any) = async (text: string | QueryConfig, params?: any[]) => {
    const start = Date.now();

    const sql = typeof text === 'string' ? text : text.text;
    const fullQuery = interpolateQuery(sql, params);

    logger.info('📘 SQL QUERY:');
    logger.info(fullQuery.trim()); // full copy-paste version

    try {
      const result = await originalQuery(text as any, params);
      logger.info(`✅ SUCCESS (${Date.now() - start}ms) – rows: ${result.rowCount}`);
      return result;
    } catch (error) {
      logger.error(`❌ FAILED (${Date.now() - start}ms): ${(error as Error).message}`);
      throw error;
    }
  };
}

/* -------------------------------------------------------
   Clean query() that returns rows only
------------------------------------------------------- */

export const query = async <T = any>(text: string, params?: any[]): Promise<T[]> => {
  const result = await pool.query(text, params);
  return result.rows as T[];
};

export default pool;
