#!/usr/bin/env node
/**
 * Backup / restore Translation and Themes to JSON.
 * Default path: src/prisma/json/translation-themes.json
 *
 * Usage (from backend/):
 *   npx ts-node -r tsconfig-paths/register ./tools/translation-theme-backup-restore.ts backup
 *   npx ts-node -r tsconfig-paths/register ./tools/translation-theme-backup-restore.ts restore
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Prisma } from '@/generated/prisma/client';
import PrismaDBConnection from '@/prisma/prisma-client';
import { logger } from '@/logging/logger';

const SEED_JSON_DIR = path.resolve(__dirname, '../src/prisma/json');
const DEFAULT_FILE = path.join(SEED_JSON_DIR, 'translation-themes.json');

interface TranslationThemeBackup {
  version: 1;
  exportedAt: string;
  translations: Array<{
    id: number;
    locale: string;
    messages: Prisma.JsonValue;
  }>;
  themes: Array<{
    id: string;
    name: string;
    lightTheme: Prisma.JsonValue;
    darkTheme: Prisma.JsonValue;
    isDefault: boolean;
    isActive: boolean;
  }>;
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function backup(outPath: string): Promise<void> {
  const prisma = PrismaDBConnection.getConnection();
  const translations = await prisma.translation.findMany({ where: { deletedAt: null } });
  const themes = await prisma.theme.findMany({ where: { deletedAt: null } });

  const payload: TranslationThemeBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    translations: translations.map(t => ({
      id: t.id,
      locale: t.locale,
      messages: t.messages,
    })),
    themes: themes.map(th => ({
      id: th.id,
      name: th.name,
      lightTheme: th.lightTheme,
      darkTheme: th.darkTheme,
      isDefault: th.isDefault,
      isActive: th.isActive,
    })),
  };

  ensureDir(outPath);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  logger.info(
    `Backup written: ${outPath} (${payload.translations.length} locales, ${payload.themes.length} themes)`,
  );
}

async function restore(filePath: string): Promise<void> {
  const prisma = PrismaDBConnection.getConnection();
  if (!fs.existsSync(filePath)) {
    logger.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const payload = JSON.parse(raw) as TranslationThemeBackup;
  if (payload.version !== 1 || !Array.isArray(payload.translations) || !Array.isArray(payload.themes)) {
    logger.error('Invalid backup format (expected version 1 with translations and themes arrays).');
    process.exit(1);
  }

  // Reset existing records first.
  await prisma.$transaction([
    prisma.translation.deleteMany({}),
    prisma.theme.deleteMany({}),
  ]);

  for (const row of payload.translations) {
    await prisma.translation.create({
      data: { locale: row.locale, messages: row.messages as Prisma.InputJsonValue },
    });
  }

  for (const row of payload.themes) {
    await prisma.theme.create({
      data: {
        id: row.id,
        name: row.name,
        lightTheme: row.lightTheme as Prisma.InputJsonValue,
        darkTheme: row.darkTheme as Prisma.InputJsonValue,
        isDefault: row.isDefault,
        isActive: row.isActive,
      },
    });
  }

  logger.info(`Restore completed from ${filePath}.`);
}

void (async () => {
  try {
    await yargs(hideBin(process.argv))
      .scriptName('translation-theme-backup-restore')
      .command(
        'backup',
        'Export Translation and Themes tables to JSON',
        y =>
          y.option('output', {
            type: 'string',
            description: 'Output JSON file path',
            default: DEFAULT_FILE,
          }),
        async argv => {
          try {
            await backup(argv.output as string);
          } finally {
            await PrismaDBConnection.disconnect();
          }
        },
      )
      .command(
        'restore',
        'Import Translation and Themes from JSON',
        y =>
          y.option('file', {
            type: 'string',
            description: 'Input JSON file path',
            default: DEFAULT_FILE,
          }),
        async argv => {
          try {
            await restore(argv.file as string);
          } finally {
            await PrismaDBConnection.disconnect();
          }
        },
      )
      .demandCommand(1, 'Use: backup | restore')
      .strict()
      .help()
      .parseAsync();
    process.exit(0);
  } catch (err) {
    logger.error('translation-theme backup/restore failed', err);
    await PrismaDBConnection.disconnect();
    process.exit(1);
  }
})();
