import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';
import { DB_LOG, RUNTIME_DATABASE_URL } from '@/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { buildPgPoolConfig, probePgSessionTimezone, armUtcSessionTimezone } from '@/lib/pg-ssl';
import { isPoolSaturatedError, isRetryableReadDisconnect, isRetryableConnectError } from '@/lib/pg-errors';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __pgPool__: Pool | undefined;
}

const READ_OPS = new Set([
  'findMany',
  'findFirst',
  'findUnique',
  'findUniqueOrThrow',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

async function withTransientRetry<T>(
  operation: () => Promise<T>,
  opName: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const isRead = READ_OPS.has(opName);
    // A second try only when the statement never reached Postgres, or a read
    // lost its connection. Retrying a write after "connection terminated" can
    // insert the row twice. Retrying a full pool just piles more waiters on it.
    const retry =
      !isPoolSaturatedError(error) &&
      (isRetryableConnectError(error) || (isRead && isRetryableReadDisconnect(error)));
    if (!retry) throw error;
    logger.warn(`Transient DB error, retrying once: ${(error as Error).message}`);
    await new Promise((resolve) => setTimeout(resolve, 150));
    return operation();
  }
}

function attachPoolErrorHandlers(pool: Pool): void {
  pool.on('error', (err) => {
    // Idle client errors must be handled or Node can crash the process.
    logger.error(`PostgreSQL pool idle client error: ${err.message}`);
  });
}

function createPrismaClient(): PrismaClient {
  if (!RUNTIME_DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const createdPool = !globalThis.__pgPool__;
  const pool = globalThis.__pgPool__ ?? new Pool(buildPgPoolConfig(RUNTIME_DATABASE_URL));
  attachPoolErrorHandlers(pool);
  globalThis.__pgPool__ = pool;
  if (createdPool) {
    armUtcSessionTimezone(pool, 'UTC');
    probePgSessionTimezone(pool, (message) => logger.info(message));
  }

  const adapter = new PrismaPg(pool, {
    onPoolError: (err) => logger.error(`Prisma PG pool error: ${err.message}`),
    onConnectionError: (err) => logger.error(`Prisma PG connection error: ${err.message}`),
  });

  const base = new PrismaClient({
    adapter,
    log: DB_LOG ? [{ emit: 'event', level: 'query' }] : ['error', 'warn'],
  });

  if (DB_LOG) {
    base.$on('query', (e) => {
      logger.info(`Query: ${e.query}`);
      logger.info(`Params: ${e.params}`);
      logger.info(`Duration: ${e.duration}ms`);
    });
  }

  // Retry once/twice on dropped idle connections (common with remote managed PG).
  const prisma = base.$extends({
    query: {
      $allOperations({ args, query, operation }) {
        return withTransientRetry(() => query(args), operation);
      },
    },
  }) as unknown as PrismaClient;

  return prisma;
}

class PrismaDBConnection {
  private static instance: PrismaClient | null = null;

  private constructor() {
    // Prevent instantiation; use static methods only.
  }

  public static getConnection(): PrismaClient {
    if (PrismaDBConnection.instance) return PrismaDBConnection.instance;

    if (globalThis.__prisma__) {
      PrismaDBConnection.instance = globalThis.__prisma__;
      return globalThis.__prisma__;
    }

    const prisma = createPrismaClient();

    if (process.env.NODE_ENV !== 'production') {
      globalThis.__prisma__ = prisma;
    }

    PrismaDBConnection.instance = prisma;
    logger.info('Prisma DB Connection ready.');

    return prisma;
  }

  public static async disconnect(): Promise<void> {
    if (!PrismaDBConnection.instance) return;

    await PrismaDBConnection.instance.$disconnect();
    PrismaDBConnection.instance = null;
    globalThis.__prisma__ = undefined;

    if (globalThis.__pgPool__) {
      await globalThis.__pgPool__.end().catch((err: Error) => {
        logger.warn(`PostgreSQL pool end warning: ${err.message}`);
      });
      globalThis.__pgPool__ = undefined;
    }

    logger.info('Prisma DB Connection closed.');
  }
}

export default PrismaDBConnection;
