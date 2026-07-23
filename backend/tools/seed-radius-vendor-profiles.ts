#!/usr/bin/env ts-node
/**
 * Seed RADIUS attribute catalog + MikroTik / Ruijie vendor profiles for a tenant.
 *
 * Usage (from backend/):
 *   yarn data:radius:seed-vendors -- --org=AA
 *   yarn data:radius:seed-vendors -- --all-orgs
 */
import 'dotenv/config';
import PrismaDBConnection from '@/prisma/prisma-client';
import { seedRadiusMikrotikRuijieForOrg } from '@/prisma/data/seed-radius-mikrotik-ruijie';

const prisma = PrismaDBConnection.getConnection();

function parseArgs(argv: string[]) {
  let orgCode: string | undefined;
  let allOrgs = false;
  for (const arg of argv) {
    if (arg === '--all-orgs' || arg === '--allOrgs') allOrgs = true;
    if (arg.startsWith('--org=')) orgCode = arg.slice('--org='.length).trim() || undefined;
  }
  return { orgCode, allOrgs };
}

async function main() {
  const { orgCode, allOrgs } = parseArgs(process.argv.slice(2));

  if (!orgCode && !allOrgs) {
    throw new Error('Pass --org=CODE or --all-orgs');
  }

  const orgs = allOrgs
    ? await prisma.org.findMany({
        where: { deletedAt: null },
        select: { id: true, code: true },
        orderBy: { code: 'asc' },
      })
    : await prisma.org.findMany({
        where: { code: orgCode!, deletedAt: null },
        select: { id: true, code: true },
        take: 1,
      });

  if (orgs.length === 0) {
    throw new Error(allOrgs ? 'No organizations found.' : `Org not found: ${orgCode}`);
  }

  for (const org of orgs) {
    const result = await seedRadiusMikrotikRuijieForOrg(prisma, org.id, org.code);
    console.log(
      `[radius] org=${result.orgCode} attributes=${result.attributesUpserted} profiles=${result.profilesUpserted} links=${result.linksUpserted}`
    );
  }

  console.log(`[radius] Done (${orgs.length} org(s)).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
