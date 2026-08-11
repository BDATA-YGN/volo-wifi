/**
 * Hard-delete two WiFi sites and ONLY rows scoped to those site IDs.
 * Shared org/reseller/member records and other sites are left intact.
 *
 * Targets:
 *   - INT_ID_04 / ST-ID_04  → b28870f0-5f7a-4da3-a4a7-c8cafdc4eee6
 *   - IND_ID_11 / ST-ID_11  → e55397d3-37a5-4ae9-bd65-4d9ad8a65ebd
 *
 * Scope rules:
 *   - DELETE only where stationId / wifiStationId / sourceStationId = this site
 *   - Reseller.stationIds JSON: remove these ids only (keep other site ids)
 *   - OrgMemberRole: clear stationId when it points at this site (do not delete the role)
 *   - Do not touch sales/devices/credentials of any other site
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register ./tools/delete-sites-int-id04-ind-id11.ts
 *   npx ts-node -r tsconfig-paths/register ./tools/delete-sites-int-id04-ind-id11.ts -- --apply
 */
import 'dotenv/config';
import PrismaDBConnection from '@/prisma/prisma-client';

const prisma = PrismaDBConnection.getConnection();

const SITE_IDS = [
  'b28870f0-5f7a-4da3-a4a7-c8cafdc4eee6', // INT_ID_04 / ST-ID_04
  'e55397d3-37a5-4ae9-bd65-4d9ad8a65ebd', // IND_ID_11 / ST-ID_11
] as const;

const APPLY = process.argv.includes('--apply');
const TX_TIMEOUT_MS = 180_000;

type Inventory = {
  id: string;
  code: string;
  name: string;
  status: string;
  deletedAt: Date | null;
  orgId: string;
  counts: Record<string, number>;
};

async function inventorySite(id: string): Promise<Inventory | null> {
  const site = await prisma.wifiStation.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      deletedAt: true,
      orgId: true,
      _count: {
        select: {
          devices: true,
          credentials: true,
          sales: true,
          sessions: true,
          voucherBatches: true,
          priceBooks: true,
          planRadiusOverrides: true,
          resellerStations: true,
          memberRoles: true,
          memberStationScopes: true,
          dailyStats: true,
          monthlyStats: true,
          yearlyStats: true,
          dailyRadiusUsageStats: true,
          finSettlements: true,
          rptFinSourceCoverages: true,
          seededOrgRadiusProfiles: true,
        },
      },
    },
  });
  if (!site) return null;
  return {
    id: site.id,
    code: site.code,
    name: site.name,
    status: site.status,
    deletedAt: site.deletedAt,
    orgId: site.orgId,
    counts: site._count,
  };
}

function printInventory(inv: Inventory) {
  console.log(`\n=== ${inv.name} (${inv.code}) ===`);
  console.log(`id=${inv.id}`);
  console.log(`status=${inv.status} deletedAt=${inv.deletedAt?.toISOString() ?? 'null'}`);
  console.log('related counts (this site only):');
  for (const [k, v] of Object.entries(inv.counts)) {
    if (v > 0) console.log(`  - ${k}: ${v}`);
  }
  if (Object.values(inv.counts).every((n) => n === 0)) {
    console.log('  (none)');
  }
}

/** Remove only these site ids from reseller JSON; keep other site links. */
async function stripStationFromResellerJson(stationIds: string[], orgIds: string[]) {
  const idSet = new Set(stationIds);
  const resellers = await prisma.reseller.findMany({
    where: { orgId: { in: orgIds } },
    select: { id: true, code: true, stationIds: true },
  });

  let updated = 0;
  for (const row of resellers) {
    const raw = row.stationIds;
    if (!Array.isArray(raw)) continue;
    const asStrings = raw.filter((v): v is string => typeof v === 'string');
    if (!asStrings.some((id) => idSet.has(id))) continue;
    const next = asStrings.filter((id) => !idSet.has(id));
    await prisma.reseller.update({
      where: { id: row.id },
      data: { stationIds: next },
    });
    updated += 1;
    console.log(`  reseller ${row.code}: stationIds ${asStrings.length} → ${next.length}`);
  }
  return updated;
}

async function hardDeleteOneSite(siteId: string) {
  return prisma.$transaction(
    async (tx) => {
      const site = await tx.wifiStation.findUnique({
        where: { id: siteId },
        select: { id: true, code: true, name: true },
      });
      if (!site) {
        return { missing: true as const, site: null, actions: {} as Record<string, number> };
      }

      const actions: Record<string, number> = {};
      const onlyThisSite = { stationId: siteId } as const;

      // --- Restrict FKs (site-scoped join rows only) ---
      actions.memberStationScopes = (
        await tx.orgMemberStation.deleteMany({ where: onlyThisSite })
      ).count;
      actions.memberRolesStationCleared = (
        await tx.orgMemberRole.updateMany({
          where: onlyThisSite,
          data: { stationId: null },
        })
      ).count;
      actions.resellerStations = (
        await tx.resellerStation.deleteMany({ where: onlyThisSite })
      ).count;
      actions.finSettlements = (
        await tx.rptFinSettlement.deleteMany({ where: onlyThisSite })
      ).count;
      actions.finSourceCoverages = (
        await tx.rptFinSourceCoverage.deleteMany({ where: onlyThisSite })
      ).count;

      // --- Site-scoped reporting ---
      actions.dailySalesStats = (
        await tx.dailySalesStat.deleteMany({ where: onlyThisSite })
      ).count;
      actions.monthlySalesStats = (
        await tx.monthlySalesStat.deleteMany({ where: onlyThisSite })
      ).count;
      actions.yearlySalesStats = (
        await tx.yearlySalesStat.deleteMany({ where: onlyThisSite })
      ).count;
      actions.dailyRadiusUsageStats = (
        await tx.dailyRadiusUsageStat.deleteMany({ where: onlyThisSite })
      ).count;

      // --- Site-scoped sessions / profiles ---
      actions.radiusSessions = (
        await tx.radiusSession.deleteMany({ where: onlyThisSite })
      ).count;
      actions.orgRadiusProfilesUnlinked = (
        await tx.orgRadiusProfile.updateMany({
          where: { sourceStationId: siteId },
          data: { sourceStationId: null },
        })
      ).count;

      // --- Sales for THIS site only (payments first; items cascade with order) ---
      const saleOrders = await tx.saleOrder.findMany({
        where: onlyThisSite,
        select: { id: true },
      });
      const saleOrderIds = saleOrders.map((o) => o.id);
      if (saleOrderIds.length > 0) {
        actions.payments = (
          await tx.payment.deleteMany({ where: { orderId: { in: saleOrderIds } } })
        ).count;
        actions.saleOrders = (
          await tx.saleOrder.deleteMany({ where: { id: { in: saleOrderIds } } })
        ).count;
      } else {
        actions.payments = 0;
        actions.saleOrders = 0;
      }

      // --- Credentials bound to THIS site (captive sessions cascade) ---
      actions.credentials = (
        await tx.credential.deleteMany({ where: onlyThisSite })
      ).count;

      // --- Voucher batches for THIS site (after their site-bound creds are gone) ---
      const batches = await tx.voucherBatch.findMany({
        where: onlyThisSite,
        select: { id: true },
      });
      const batchIds = batches.map((b) => b.id);
      if (batchIds.length > 0) {
        // Only remove batch creds that are not bound to a different site.
        actions.batchCredentials = (
          await tx.credential.deleteMany({
            where: {
              voucherBatchId: { in: batchIds },
              OR: [{ stationId: null }, { stationId: siteId }],
            },
          })
        ).count;
        // Any leftover creds pointing at another site: unlink batch, keep credential.
        actions.batchCredentialsUnlinkedOtherSite = (
          await tx.credential.updateMany({
            where: { voucherBatchId: { in: batchIds } },
            data: { voucherBatchId: null },
          })
        ).count;
        actions.voucherBatches = (
          await tx.voucherBatch.deleteMany({ where: { id: { in: batchIds } } })
        ).count;
      } else {
        actions.batchCredentials = 0;
        actions.batchCredentialsUnlinkedOtherSite = 0;
        actions.voucherBatches = 0;
      }

      // --- Retail / RADIUS overrides for THIS site ---
      actions.priceBookStations = (
        await tx.planPriceBookStation.deleteMany({ where: onlyThisSite })
      ).count;
      actions.planRadiusOverrides = (
        await tx.planRadiusAttribute.deleteMany({ where: { wifiStationId: siteId } })
      ).count;

      // --- NAS devices for THIS site ---
      actions.devices = (await tx.stationDevice.deleteMany({ where: onlyThisSite })).count;

      // --- Hard-delete the station row ---
      await tx.wifiStation.delete({ where: { id: siteId } });
      actions.stationHardDeleted = 1;

      return { missing: false as const, site, actions };
    },
    { timeout: TX_TIMEOUT_MS }
  );
}

async function main() {
  console.log(APPLY ? 'MODE: APPLY (hard delete)' : 'MODE: DRY-RUN (no writes)');
  console.log('Sites:', SITE_IDS.join(', '));

  const inventories: Inventory[] = [];
  for (const id of SITE_IDS) {
    const inv = await inventorySite(id);
    if (!inv) {
      console.log(`\n!!! Site not found: ${id}`);
      continue;
    }
    inventories.push(inv);
    printInventory(inv);
  }

  if (!inventories.length) {
    console.log('\nNothing to do.');
    return;
  }

  console.log('\n--- Planned hard cleanup (scoped to these site ids only) ---');
  console.log('DELETE where stationId = site:');
  console.log('  • wf_org_member_station');
  console.log('  • wf_reseller_station');
  console.log('  • rpt_fin_* (if any)');
  console.log('  • rpt_* sales/radius stats');
  console.log('  • wf_radius_session');
  console.log('  • wf_sale_order (+ payments/items for those orders)');
  console.log('  • wf_credential (station-bound + batch-bound for these batches)');
  console.log('  • wf_voucher_batch');
  console.log('  • wf_plan_price_book_station');
  console.log('  • wf_plan_radius_attribute (wifiStationId)');
  console.log('  • wf_station_device');
  console.log('  • wf_station');
  console.log('UPDATE only (do not delete shared rows):');
  console.log('  • wf_org_member_role.station_id → null (role kept)');
  console.log('  • org_radius_profile.source_station_id → null');
  console.log('  • Reseller.stationIds JSON — remove these ids only');

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with -- --apply to execute.');
    return;
  }

  console.log('\nApplying hard deletes…');
  for (const inv of inventories) {
    const out = await hardDeleteOneSite(inv.id);
    if (out.missing || !out.site) {
      console.log(`\n${inv.name}: already gone — skipped`);
      continue;
    }
    console.log(`\n${out.site.name} (${out.site.code}):`);
    for (const [k, v] of Object.entries(out.actions)) {
      if (v > 0) console.log(`  ${k}: ${v}`);
    }
  }

  console.log('\nUpdating Reseller.stationIds JSON (other sites kept)…');
  const orgIds = [...new Set(inventories.map((i) => i.orgId))];
  const jsonUpdated = await stripStationFromResellerJson([...SITE_IDS], orgIds);
  console.log(`  resellers updated: ${jsonUpdated}`);

  console.log('\nDone. Both sites were hard-deleted; other sites untouched.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
