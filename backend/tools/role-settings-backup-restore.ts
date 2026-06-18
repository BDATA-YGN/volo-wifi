#!/usr/bin/env node
/**
 * Backup / restore MngRoles, MngRoleSettings, and MapRoleSettings to JSON.
 * Default path: src/prisma/json/role-settings.json
 *
 * Usage (from backend/):
 *   npx ts-node -r tsconfig-paths/register ./tools/role-settings-backup-restore.ts backup
 *   npx ts-node -r tsconfig-paths/register ./tools/role-settings-backup-restore.ts restore
 *   npx ts-node -r tsconfig-paths/register ./tools/role-settings-backup-restore.ts restore --file ./other.json
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import PrismaDBConnection from '@/prisma/prisma-client';
import { logger } from '@/logging/logger';

const SEED_JSON_DIR = path.resolve(__dirname, '../src/prisma/json');
const DEFAULT_FILE = path.join(SEED_JSON_DIR, 'role-settings.json');

// Mirror of Prisma's `MngRoleSettingKind` enum. Kept as a local const so the
// tool stays decoupled from the generated client (older backup files may also
// contain invalid kinds — those are normalized to `feature`).
const MNG_ROLE_SETTING_KINDS = ['menuGroup', 'menu', 'button', 'feature'] as const;
type MngRoleSettingKind = (typeof MNG_ROLE_SETTING_KINDS)[number];

function normalizeKind(value: unknown): MngRoleSettingKind {
  return (MNG_ROLE_SETTING_KINDS as readonly string[]).includes(value as string)
    ? (value as MngRoleSettingKind)
    : 'feature';
}

interface RoleSettingsBackup {
  version: 1;
  exportedAt: string;
  mngRoles: Array<{
    id: number;
    roleId: number;
    roleName: string;
    description: string | null;
    level: string | null;
  }>;
  mngRoleSettings: Array<{
    id: string;
    settingKey: string;
    description: string | null;
    parentId: string | null;
    level: string | null;
    kind?: MngRoleSettingKind;
  }>;
  mapRoleSettings: Array<{
    id: string;
    roleId: number;
    settingKey: string;
    enable: boolean;
    visibility: boolean;
    mngRoleSettingKey?: string;
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
  const mngRoles = await prisma.mngRoles.findMany({ where: { deletedAt: null } });
  const mngRoleSettings = await prisma.mngRoleSettings.findMany({ where: { deletedAt: null } });
  const mapRoleSettingsRows = await prisma.mapRoleSettings.findMany({ where: { deletedAt: null } });
  const mngSettingById = new Map(mngRoleSettings.map(s => [s.id, s]));
  const mapRoleSettings = mapRoleSettingsRows.map(row => {
    const mng = mngSettingById.get(row.settingKey);
    return {
      id: row.id,
      roleId: row.roleId,
      settingKey: row.settingKey,
      enable: row.enable,
      visibility: row.visibility,
      mngRoleSettingKey: mng?.settingKey,
    };
  });

  const payload: RoleSettingsBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    mngRoles: mngRoles.map(r => ({
      id: r.id,
      roleId: r.roleId,
      roleName: r.roleName,
      description: r.description,
      level: r.level,
    })),
    mngRoleSettings: mngRoleSettings.map(s => ({
      id: s.id,
      settingKey: s.settingKey,
      description: s.description,
      parentId: s.parentId,
      level: s.level,
      kind: normalizeKind((s as { kind?: unknown }).kind),
    })),
    mapRoleSettings,
  };

  ensureDir(outPath);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  logger.info(
    `Backup written: ${outPath} (${payload.mngRoles.length} roles, ${payload.mngRoleSettings.length} mng role settings, ${payload.mapRoleSettings.length} map role settings)`,
  );
}

async function restore(filePath: string): Promise<void> {
  const prisma = PrismaDBConnection.getConnection();
  if (!fs.existsSync(filePath)) {
    logger.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const payload = JSON.parse(raw) as RoleSettingsBackup;
  if (payload.version !== 1 || !Array.isArray(payload.mngRoles) || !Array.isArray(payload.mngRoleSettings) || !Array.isArray(payload.mapRoleSettings)) {
    logger.error('Invalid backup format (expected version 1 and mngRoles / mngRoleSettings / mapRoleSettings arrays).');
    process.exit(1);
  }

  // Reset existing role settings first (FK: MapRoleSettings -> MngRoleSettings).
  // We intentionally do NOT delete roles because other tables may reference them.
  await prisma.$transaction([
    prisma.mapRoleSettings.deleteMany({}),
    prisma.mngRoleSettings.deleteMany({}),
  ]);

  for (const row of payload.mngRoles) {
    const existing = await prisma.mngRoles.findFirst({ where: { roleId: row.roleId } });
    if (existing) {
      await prisma.mngRoles.update({
        where: { id: existing.id },
        data: { roleName: row.roleName, description: row.description, level: row.level },
      });
    } else {
      await prisma.mngRoles.create({
        data: { roleId: row.roleId, roleName: row.roleName, description: row.description, level: row.level },
      });
    }
  }

  const mngSettingKeyToId = new Map<string, string>();
  for (const row of payload.mngRoleSettings) {
    const created = await prisma.mngRoleSettings.create({
      data: {
        settingKey: row.settingKey,
        description: row.description,
        parentId: row.parentId,
        level: row.level,
        kind: normalizeKind(row.kind),
      },
    });
    mngSettingKeyToId.set(row.settingKey, created.id);
  }

  for (const row of payload.mapRoleSettings) {
    const mngKey = row.mngRoleSettingKey ?? payload.mngRoleSettings.find(m => m.id === row.settingKey)?.settingKey;
    const newSettingKey = mngKey ? mngSettingKeyToId.get(mngKey) : undefined;
    const settingKey = newSettingKey ?? row.settingKey;
    await prisma.mapRoleSettings.create({
      data: { roleId: row.roleId, settingKey, enable: row.enable, visibility: row.visibility },
    });
  }

  logger.info(`Restore completed from ${filePath}.`);
}

void (async () => {
  try {
    await yargs(hideBin(process.argv))
      .scriptName('role-settings-backup-restore')
      .command(
        'backup',
        'Export MngRoles, MngRoleSettings, MapRoleSettings to JSON',
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
        'Import MngRoles, MngRoleSettings, MapRoleSettings from JSON',
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
    logger.error('role-settings backup/restore failed', err);
    await PrismaDBConnection.disconnect();
    process.exit(1);
  }
})();
