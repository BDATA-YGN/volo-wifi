/**
 * One-shot upsert for the `dev_direct_chat_excluded_roles` AppSetting row.
 *
 * Why a dedicated script: the main `seed.ts` re-runs `upsert` with
 * `update: { value: ... }`, which would overwrite operator-saved values on
 * the other ~50 keys. This script only touches the single new key and
 * deliberately uses `update: {}` so existing values survive when re-run.
 *
 *   npx ts-node -r tsconfig-paths/register tools/upsert-direct-chat-excluded-roles.ts
 */
import PrismaDBConnection from '@/prisma/prisma-client';

async function main() {
  const prisma = await PrismaDBConnection.getConnection();
  const key = 'dev_direct_chat_excluded_roles';
  await prisma.appSetting.upsert({
    where: { key },
    create: {
      key,
      value: JSON.stringify([]),
      defaultValue: JSON.stringify([]),
      valueType: 'JSON',
      controlType: 'LIST',
      category: 'developer',
      sortOrder: 23,
      labelEn: 'Roles hidden from Direct Chat',
      labelMy: 'Direct Chat မှ ဖျောက်ထားသော Role များ',
      description:
        'Admins whose role matches any value here are hidden from the New DM recipient picker. Compares case-insensitively against MngRoles.roleName.',
      isPublic: false,
    },
    // Update nothing — preserve any operator-edited values on re-run.
    update: {},
  });
  // eslint-disable-next-line no-console
  console.log(`✅ Upserted AppSetting key="${key}"`);
  await prisma.$disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
