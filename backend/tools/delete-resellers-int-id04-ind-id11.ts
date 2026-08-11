/**
 * Hard-delete the 18 resellers left with empty stationIds after INT_ID_04 / IND_ID_11 site deletion.
 * Also removes their PARTNER OrgMember + Admin portal accounts (1:1, not shared).
 *
 * Targets (by code):
 *   AA1101–AA1106, RS-009–RS-017, RS-031–RS-033
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register ./tools/delete-resellers-int-id04-ind-id11.ts
 *   npx ts-node -r tsconfig-paths/register ./tools/delete-resellers-int-id04-ind-id11.ts -- --apply
 */
import 'dotenv/config';
import PrismaDBConnection from '@/prisma/prisma-client';

const prisma = PrismaDBConnection.getConnection();

const RESELLER_CODES = [
  'AA1101',
  'AA1102',
  'AA1103',
  'AA1104',
  'AA1105',
  'AA1106',
  'RS-009',
  'RS-010',
  'RS-011',
  'RS-012',
  'RS-013',
  'RS-014',
  'RS-015',
  'RS-016',
  'RS-017',
  'RS-031',
  'RS-032',
  'RS-033',
] as const;

const APPLY = process.argv.includes('--apply');
const TX_TIMEOUT_MS = 180_000;

type ResellerRow = {
  id: string;
  code: string;
  name: string;
  adminId: string | null;
  stationIds: unknown;
  counts: Record<string, number>;
};

async function loadTargets(): Promise<ResellerRow[]> {
  const rows = await prisma.reseller.findMany({
    where: { code: { in: [...RESELLER_CODES] } },
    select: {
      id: true,
      code: true,
      name: true,
      adminId: true,
      stationIds: true,
      _count: {
        select: {
          credentials: true,
          voucherBatches: true,
          sales: true,
          priceBooks: true,
          commissionRules: true,
          payouts: true,
          dailyStats: true,
          monthlyStats: true,
          yearlyStats: true,
          dailyRadiusUsageStats: true,
          planEntitlements: true,
          memberRoles: true,
          resellerStations: true,
          finSettlements: true,
          rptFinSourceCoverages: true,
        },
      },
    },
    orderBy: { code: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    adminId: r.adminId,
    stationIds: r.stationIds,
    counts: r._count,
  }));
}

function printInventory(rows: ResellerRow[]) {
  console.log(`\n=== Resellers to delete (${rows.length}) ===`);
  for (const r of rows) {
    const nonZero = Object.fromEntries(Object.entries(r.counts).filter(([, v]) => v > 0));
    console.log(
      `  ${r.code} (${r.name}) id=${r.id} adminId=${r.adminId ?? 'null'} stationIds=${JSON.stringify(r.stationIds)} counts=${JSON.stringify(nonZero)}`,
    );
  }
  const missing = RESELLER_CODES.filter((c) => !rows.some((r) => r.code === c));
  if (missing.length) console.log('  missing codes (already gone):', missing.join(', '));
}

async function assertSafe(rows: ResellerRow[]) {
  const blockers: string[] = [];
  for (const r of rows) {
    const stations = Array.isArray(r.stationIds)
      ? r.stationIds.filter((v): v is string => typeof v === 'string')
      : [];
    if (stations.length > 0) blockers.push(`${r.code}: still has stationIds ${stations.join(',')}`);
    if (r.counts.finSettlements > 0) blockers.push(`${r.code}: has finSettlements`);
    if (r.counts.rptFinSourceCoverages > 0) blockers.push(`${r.code}: has rptFinSourceCoverages`);
    if (r.counts.sales > 0) blockers.push(`${r.code}: has sales (will SetNull — unexpected leftover)`);
    if (r.counts.credentials > 0) blockers.push(`${r.code}: has credentials`);
    if (r.counts.resellerStations > 0) blockers.push(`${r.code}: has resellerStations`);
  }

  const adminIds = [...new Set(rows.map((r) => r.adminId).filter(Boolean))] as string[];
  if (adminIds.length) {
    const shared = await prisma.reseller.findMany({
      where: { adminId: { in: adminIds }, NOT: { id: { in: rows.map((r) => r.id) } } },
      select: { code: true, adminId: true },
    });
    for (const s of shared) blockers.push(`admin ${s.adminId} also owns reseller ${s.code}`);
  }

  if (blockers.length) {
    console.error('\nAbort — unsafe to hard-delete:');
    for (const b of blockers) console.error(`  - ${b}`);
    process.exit(1);
  }
}

async function hardDelete(rows: ResellerRow[]) {
  const resellerIds = rows.map((r) => r.id);
  const adminIds = [...new Set(rows.map((r) => r.adminId).filter(Boolean))] as string[];

  await prisma.$transaction(
    async (tx) => {
      // Restrict FK: OrgMemberRole.resellerId
      const roles = await tx.orgMemberRole.deleteMany({
        where: { resellerId: { in: resellerIds } },
      });
      console.log(`  deleted OrgMemberRole: ${roles.count}`);

      // Org members that only existed for these PARTNER logins
      const members = await tx.orgMember.findMany({
        where: { adminId: { in: adminIds } },
        select: { id: true, adminId: true, _count: { select: { roles: true } } },
      });
      const emptyMemberIds = members.filter((m) => m._count.roles === 0).map((m) => m.id);
      if (emptyMemberIds.length) {
        const delMembers = await tx.orgMember.deleteMany({ where: { id: { in: emptyMemberIds } } });
        console.log(`  deleted OrgMember: ${delMembers.count}`);
      } else {
        console.log('  deleted OrgMember: 0');
      }

      // Cascade: plan entitlements, price-book links, resellerStations
      const delResellers = await tx.reseller.deleteMany({ where: { id: { in: resellerIds } } });
      console.log(`  deleted Reseller: ${delResellers.count}`);

      if (adminIds.length) {
        const tokens = await tx.adminToken.deleteMany({ where: { adminId: { in: adminIds } } });
        console.log(`  deleted AdminToken: ${tokens.count}`);
        const admins = await tx.admin.deleteMany({ where: { id: { in: adminIds } } });
        console.log(`  deleted Admin: ${admins.count}`);
      }
    },
    { timeout: TX_TIMEOUT_MS },
  );
}

async function main() {
  console.log(APPLY ? 'MODE: APPLY (hard delete)' : 'MODE: DRY-RUN (no writes)');
  const rows = await loadTargets();
  printInventory(rows);
  if (!rows.length) {
    console.log('\nNothing to delete.');
    return;
  }
  await assertSafe(rows);

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to hard-delete these resellers + portal admins.');
    return;
  }

  console.log('\nApplying hard delete…');
  await hardDelete(rows);

  const left = await prisma.reseller.findMany({
    where: { code: { in: [...RESELLER_CODES] } },
    select: { code: true },
  });
  console.log(`\nRemaining matching codes: ${left.length ? left.map((r) => r.code).join(', ') : '(none)'}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
