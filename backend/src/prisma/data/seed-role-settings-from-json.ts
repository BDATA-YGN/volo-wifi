import * as fs from 'fs';
import type { PrismaClient } from '@/generated/prisma/client';

const MNG_ROLE_SETTING_KINDS = ['menuGroup', 'menu', 'button', 'feature'] as const;
type MngRoleSettingKind = (typeof MNG_ROLE_SETTING_KINDS)[number];

function normalizeKind(value: unknown): MngRoleSettingKind {
  return (MNG_ROLE_SETTING_KINDS as readonly string[]).includes(value as string)
    ? (value as MngRoleSettingKind)
    : 'feature';
}

export interface RoleSettingsBackup {
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

export async function seedRoleSettingsFromJson(
  prisma: PrismaClient,
  filePath: string,
): Promise<{ roles: number; mngSettings: number; mapSettings: number }> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Role settings JSON not found: ${filePath}`);
  }

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RoleSettingsBackup;
  if (
    payload.version !== 1 ||
    !Array.isArray(payload.mngRoles) ||
    !Array.isArray(payload.mngRoleSettings) ||
    !Array.isArray(payload.mapRoleSettings)
  ) {
    throw new Error('Invalid role settings JSON: expected version 1 with mngRoles, mngRoleSettings, mapRoleSettings');
  }

  await prisma.$transaction([
    prisma.mapRoleSettings.deleteMany({}),
    prisma.mngRoleSettings.deleteMany({}),
  ]);

  for (const row of payload.mngRoles) {
    const existing = await prisma.mngRoles.findFirst({ where: { roleId: row.roleId } });
    if (existing) {
      await prisma.mngRoles.update({
        where: { id: existing.id },
        data: { roleName: row.roleName, description: row.description, level: row.level, deletedAt: null },
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
    const mngKey =
      row.mngRoleSettingKey ?? payload.mngRoleSettings.find((m) => m.id === row.settingKey)?.settingKey;
    const newSettingKey = mngKey ? mngSettingKeyToId.get(mngKey) : undefined;
    const settingKey = newSettingKey ?? row.settingKey;
    await prisma.mapRoleSettings.create({
      data: { roleId: row.roleId, settingKey, enable: row.enable, visibility: row.visibility },
    });
  }

  return {
    roles: payload.mngRoles.length,
    mngSettings: payload.mngRoleSettings.length,
    mapSettings: payload.mapRoleSettings.length,
  };
}
