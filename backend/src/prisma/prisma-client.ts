import 'dotenv/config';
import { PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';
import { DB_LOG, DATABASE_URL } from '@/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { buildPgPoolConfig } from '@/lib/pg-ssl';

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

    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }

    const pool = new PrismaPg(buildPgPoolConfig(DATABASE_URL));
    const prisma = new PrismaClient({
      adapter: pool,
      log: DB_LOG
        ? [{ emit: 'event', level: 'query' }]
        : ['error', 'warn']
    });

    if (DB_LOG) {
      prisma.$on('query', (e) => {
        logger.info(`Query: ${e.query}`);
        logger.info(`Params: ${e.params}`);
        logger.info(`Duration: ${e.duration}ms`);
      });
    }

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

    logger.info('Prisma DB Connection closed.');
  }
}

export default PrismaDBConnection;
