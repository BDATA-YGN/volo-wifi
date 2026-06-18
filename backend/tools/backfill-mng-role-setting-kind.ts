#!/usr/bin/env node
/**
 * One-shot backfill for MngRoleSettings.kind.
 *  - description starts with "menu-group." -> menuGroup
 *  - description starts with "menus."      -> menu
 *  - everything else                       -> feature (unchanged)
 *
 * Usage (from backend/):
 *   npx ts-node -r tsconfig-paths/register ./tools/backfill-mng-role-setting-kind.ts
 */

import 'dotenv/config';
import PrismaDBConnection from '@/prisma/prisma-client';
import { MngRoleSettingKind } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';

async function main() {
  const prisma = PrismaDBConnection.getConnection();

  const [menuGroupUpdated, menuUpdated] = await Promise.all([
    prisma.mngRoleSettings.updateMany({
      where: { description: { startsWith: 'menu-group.' } },
      data: { kind: MngRoleSettingKind.menuGroup },
    }),
    prisma.mngRoleSettings.updateMany({
      where: { description: { startsWith: 'menus.' } },
      data: { kind: MngRoleSettingKind.menu },
    }),
  ]);

  logger.info(
    `Backfill complete: ${menuGroupUpdated.count} menuGroup, ${menuUpdated.count} menu`,
  );
}

main()
  .catch((err) => {
    logger.error('Backfill failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await PrismaDBConnection.disconnect();
  });
