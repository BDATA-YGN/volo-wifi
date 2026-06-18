#!/usr/bin/env node
/**
 * Backup / restore MenuGroup and MenuItem to JSON.
 * Default: src/prisma/json/menu.json
 *
 * Restore also accepts a full `menu-permission-*.json` export (only menu sections are used).
 *
 * From backend/:
 *   npx ts-node -r tsconfig-paths/register ./tools/menu-backup-restore.ts backup
 *   npx ts-node -r tsconfig-paths/register ./tools/menu-backup-restore.ts restore
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import PrismaDBConnection from '@/prisma/prisma-client';
import { logger } from '@/logging/logger';

const SEED_JSON_DIR = path.resolve(__dirname, '../src/prisma/json');
const DEFAULT_FILE = path.join(SEED_JSON_DIR, 'menu.json');

interface MenuBackup {
  version: 1;
  exportedAt: string;
  menuGroups: Array<{
    id: number;
    key: string;
    title: string;
    icon: string | null;
    position: number;
    level: string | null;
    mode: number;
  }>;
  menuItems: Array<{
    id: number;
    key: string;
    title: string;
    icon: string | null;
    url: string | null;
    position: number;
    groupId: number;
    level: string | null;
    groupKey?: string;
  }>;
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parsePayload(raw: string): MenuBackup {
  const parsed = JSON.parse(raw) as Record<string, unknown> & { menuGroups?: unknown; menuItems?: unknown };
  if (parsed.version !== 1 || !Array.isArray(parsed.menuGroups) || !Array.isArray(parsed.menuItems)) {
    throw new Error('Invalid backup: expected version 1 with menuGroups and menuItems arrays');
  }
  return parsed as unknown as MenuBackup;
}

async function backup(outPath: string): Promise<void> {
  const prisma = PrismaDBConnection.getConnection();
  const groups = await prisma.menuGroup.findMany({
    where: { deletedAt: null },
    orderBy: { position: 'asc' },
  });
  const items = await prisma.menuItem.findMany({
    where: { deletedAt: null },
    orderBy: [{ groupId: 'asc' }, { position: 'asc' }],
  });
  const groupById = new Map(groups.map(g => [g.id, g]));
  const menuItems = items.map(item => {
    const g = groupById.get(item.groupId);
    return {
      id: item.id,
      key: item.key,
      title: item.title,
      icon: item.icon,
      url: item.url,
      position: item.position,
      groupId: item.groupId,
      level: item.level,
      groupKey: g?.key,
    };
  });

  const payload: MenuBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    menuGroups: groups.map(g => ({
      id: g.id,
      key: g.key,
      title: g.title,
      icon: g.icon,
      position: g.position,
      level: g.level,
      mode: g.mode,
    })),
    menuItems,
  };

  ensureDir(outPath);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  logger.info(
    `Backup written: ${outPath} (${payload.menuGroups.length} groups, ${payload.menuItems.length} items)`,
  );
}

async function restore(filePath: string): Promise<void> {
  const prisma = PrismaDBConnection.getConnection();
  if (!fs.existsSync(filePath)) {
    logger.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  let payload: MenuBackup;
  try {
    payload = parsePayload(raw);
  } catch (e) {
    logger.error((e as Error).message);
    process.exit(1);
  }

  // Reset existing records first (FK: MenuItem -> MenuGroup)
  await prisma.$transaction([
    prisma.menuItem.deleteMany({}),
    prisma.menuGroup.deleteMany({}),
  ]);

  const groupKeyToId = new Map<string, number>();
  for (const row of payload.menuGroups) {
    const created = await prisma.menuGroup.create({
      data: {
        key: row.key,
        title: row.title,
        icon: row.icon,
        position: row.position,
        level: row.level,
        mode: row.mode,
      },
    });
    groupKeyToId.set(row.key, created.id);
  }

  for (const row of payload.menuItems) {
    const groupKey = row.groupKey ?? payload.menuGroups.find(g => g.id === row.groupId)?.key;
    const newGroupId = groupKey != null ? groupKeyToId.get(groupKey) : undefined;
    const groupId = newGroupId ?? row.groupId;
    await prisma.menuItem.create({
      data: {
        key: row.key,
        title: row.title,
        icon: row.icon,
        url: row.url,
        position: row.position,
        groupId,
        level: row.level,
      },
    });
  }

  logger.info(`Restore completed from ${filePath}.`);
}

void (async () => {
  try {
    await yargs(hideBin(process.argv))
      .scriptName('menu-backup-restore')
      .command(
        'backup',
        'Export MenuGroup and MenuItem to JSON',
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
        'Import MenuGroup and MenuItem from JSON',
        y =>
          y.option('file', {
            type: 'string',
            description: 'Input JSON (menu.json or a menu-permission export)',
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
    logger.error('menu backup/restore failed', err);
    await PrismaDBConnection.disconnect();
    process.exit(1);
  }
})();
