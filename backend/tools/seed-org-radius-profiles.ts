#!/usr/bin/env ts-node
/**
 * Seed FreeRADIUS servers (Primary / optional Secondary) + one NAS device per site.
 *
 * Usage (from backend/):
 *   yarn data:radius:seed-profiles -- --org=AA
 *   yarn data:radius:seed-profiles -- --all-orgs
 *
 * Optional:
 *   FREERADIUS_SECONDARY_HOST=10.0.0.2
 */
import 'dotenv/config';
import PrismaDBConnection from '@/prisma/prisma-client';
import { seedOrgRadiusProfilesForOrg } from '@/prisma/data/seed-org-radius-profiles';

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
    const result = await seedOrgRadiusProfilesForOrg(prisma, org.id, org.code);
    console.log(
      `[freeradius-servers] org=${result.orgCode}` +
        ` servers=+${result.serversCreated}/~${result.serversUpdated}/-${result.serversRemoved}` +
        ` devices=+${result.devicesCreated}/~${result.devicesUpdated}`
    );
  }

  console.log(`[freeradius-servers] Done (${orgs.length} org(s)).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
