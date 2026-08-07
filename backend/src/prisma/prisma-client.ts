import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';
import { DB_LOG, DATABASE_URL } from '@/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { buildPgPoolConfig, probePgSessionTimezone } from '@/lib/pg-ssl';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __pgPool__: Pool | undefined;
}

function isTransientPgError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /timeout exceeded when trying to connect/i.test(message) ||
    /Connection terminated unexpectedly/i.test(message) ||
    /Connection terminated due to connection timeout/i.test(message) ||
    /server closed the connection/i.test(message) ||
    /ECONNRESET/i.test(message) ||
    /ECONNREFUSED/i.test(message) ||
    /ETIMEDOUT/i.test(message) ||
    /cannot connect/i.test(message)
  );
}

async function withTransientRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientPgError(error) || attempt === attempts) {
        throw error;
      }
      const delayMs = 150 * attempt;
      logger.warn(
        `Transient DB error (attempt ${attempt}/${attempts}), retrying in ${delayMs}ms: ${(error as Error).message}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function attachPoolErrorHandlers(pool: Pool): void {
  pool.on('error', (err) => {
    // Idle client errors must be handled or Node can crash the process.
    logger.error(`PostgreSQL pool idle client error: ${err.message}`);
  });
}

function createPrismaClient(): PrismaClient {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const createdPool = !globalThis.__pgPool__;
  const pool = globalThis.__pgPool__ ?? new Pool(buildPgPoolConfig(DATABASE_URL));
  attachPoolErrorHandlers(pool);
  globalThis.__pgPool__ = pool;
  if (createdPool) {
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
      $allOperations({ args, query }) {
        return withTransientRetry(() => query(args));
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
