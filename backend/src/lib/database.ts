import { Pool, QueryConfig } from 'pg';
import { logger } from '@/logging/logger';
import { DATABASE_URL, NODE_ENV } from '@/config';
import { buildPgPoolConfig, probePgSessionTimezone } from '@/lib/pg-ssl';

const poolConfig = buildPgPoolConfig(DATABASE_URL);
// Legacy raw-SQL pool — keep timeouts aligned with Prisma (remote DO).
poolConfig.application_name = process.env.DATABASE_APPLICATION_NAME || 'volo-wifi-raw-sql';

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error(`PostgreSQL raw pool idle client error: ${err.message}`);
});

pool
  .connect()
  .then((c) => {
    logger.info('Connected to PostgreSQL');
    c.release();
  })
  .catch((err) => logger.error('DB connection error:', err));

// Non-prod: confirm session TZ is Asia/Yangon even when DO URL has no options=.
probePgSessionTimezone(pool, (message) => logger.info(message));

function interpolateQuery(query: string, params: any[] = []) {
  return query.replace(/\$(\d+)/g, (_, num) => {
    const value = params[num - 1];

    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value instanceof Date) return `'${value.toISOString()}'`;

    return `'${String(value).replace(/'/g, "''")}'`;
  });
}

if (NODE_ENV !== 'production') {
  const originalQuery = pool.query.bind(pool);

  (pool.query as any) = async (text: string | QueryConfig, params?: any[]) => {
    const start = Date.now();

    const sql = typeof text === 'string' ? text : text.text;
    const fullQuery = interpolateQuery(sql, params);

    logger.info('📘 SQL QUERY:');
    logger.info(fullQuery.trim());

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

export const query = async <T = any>(text: string, params?: any[]): Promise<T[]> => {
  const result = await pool.query(text, params);
  return result.rows as T[];
};

export default pool;
