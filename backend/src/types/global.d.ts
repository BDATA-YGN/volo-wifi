import type { PrismaClient } from '@/generated/prisma/client';

declare global {
  // Used to cache PrismaClient during development/hot-reload.
  // Augmenting globalThis avoids TS2339 when accessed via globalThis/global.
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export {};
