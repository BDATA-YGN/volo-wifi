import * as fs from 'fs';
import type { PrismaClient } from '@/generated/prisma/client';

export interface MenuBackup {
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

function parseMenuPayload(raw: string): MenuBackup {
  const parsed = JSON.parse(raw) as Record<string, unknown> & { menuGroups?: unknown; menuItems?: unknown };
  if (parsed.version !== 1 || !Array.isArray(parsed.menuGroups) || !Array.isArray(parsed.menuItems)) {
    throw new Error('Invalid menu JSON: expected version 1 with menuGroups and menuItems arrays');
  }
  return parsed as unknown as MenuBackup;
}

export async function seedMenuFromJson(
  prisma: PrismaClient,
  filePath: string,
): Promise<{ groups: number; items: number }> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Menu JSON not found: ${filePath}`);
  }

  const payload = parseMenuPayload(fs.readFileSync(filePath, 'utf-8'));

  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;

  await prisma.$transaction(
    async (tx) => {
      await tx.menuItem.deleteMany({});
      await tx.menuGroup.deleteMany({});

      const groupKeyToId = new Map<string, number>();
      for (const row of payload.menuGroups) {
        const created = await tx.menuGroup.create({
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
        const groupKey = row.groupKey ?? payload.menuGroups.find((g) => g.id === row.groupId)?.key;
        const newGroupId = groupKey != null ? groupKeyToId.get(groupKey) : undefined;
        const groupId = newGroupId ?? row.groupId;
        await tx.menuItem.create({
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
    },
    { maxWait: 60_000, timeout: 180_000 },
  );

  return { groups: payload.menuGroups.length, items: payload.menuItems.length };
}
