#!/usr/bin/env ts-node
/**
 * Seed sample Plan RADIUS policies (global + ~2 site overrides) for a tenant.
 *
 * Usage (from backend/):
 *   yarn data:radius:seed-plan-policies -- --org=AA
 *   yarn data:radius:seed-plan-policies -- --all-orgs
 */
import 'dotenv/config';
import PrismaDBConnection from '@/prisma/prisma-client';
import { seedRadiusPlanPoliciesForOrg } from '@/prisma/data/seed-radius-plan-policies';

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
    const result = await seedRadiusPlanPoliciesForOrg(prisma, org.id, org.code);
    console.log(
      `[plan-policies] org=${result.orgCode}` +
        ` global=+${result.globalCreated}/~${result.globalUpdated}` +
        ` site=+${result.siteCreated}/~${result.siteUpdated}` +
        ` sites=[${result.siteCodes.join(', ')}]` +
        ` plans=[${result.planCodes.join(', ')}]` +
        ` profiles=[${result.profileNames.join(', ')}]`
    );
  }

  console.log(`[plan-policies] Done (${orgs.length} org(s)).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
