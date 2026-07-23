import type { PrismaClient } from '@/generated/prisma/client';
import { adminsData } from '@/prisma/data/admins';

export type ClearWifiOrgResult = {
  orgId: string;
  orgCode: string;
  deletedAdmins: number;
};

const PROTECTED_USERNAMES = new Set(
  adminsData.map((a) => a.username.toLowerCase()).concat(['developer']),
);

/**
 * Hard-delete one WiFi org and related rows (FK-safe order), then remove
 * console admins that were only used by that org (keeps seeded platform accounts).
 */
export async function clearWifiOrgByCode(
  prisma: PrismaClient,
  orgCode: string,
): Promise<ClearWifiOrgResult> {
  const org = await prisma.org.findFirst({
    where: { code: orgCode },
    select: { id: true, code: true },
  });
  if (!org) {
    throw new Error(`Org code not found in NEW database: ${orgCode}`);
  }

  const orgId = org.id;

  // Collect admin ids linked to this org before we detach FKs.
  const [orgRow, stations, resellers, members] = await Promise.all([
    prisma.org.findUnique({ where: { id: orgId }, select: { adminId: true } }),
    prisma.wifiStation.findMany({
      where: { orgId, adminId: { not: null } },
      select: { adminId: true },
    }),
    prisma.reseller.findMany({
      where: { orgId, adminId: { not: null } },
      select: { adminId: true },
    }),
    prisma.orgMember.findMany({
      where: { orgId },
      select: { adminId: true },
    }),
  ]);

  const linkedAdminIds = new Set<string>();
  if (orgRow?.adminId) linkedAdminIds.add(orgRow.adminId);
  for (const row of stations) if (row.adminId) linkedAdminIds.add(row.adminId);
  for (const row of resellers) if (row.adminId) linkedAdminIds.add(row.adminId);
  for (const row of members) linkedAdminIds.add(row.adminId);

  await prisma.$transaction(
    async (tx) => {
      await tx.captivePortalSession.deleteMany({ where: { orgId } });
      await tx.radiusSession.deleteMany({ where: { orgId } });
      await tx.radiusSessionArchive.deleteMany({ where: { orgId } });
      await tx.credentialArchive.deleteMany({ where: { orgId } });
      await tx.saleOrderArchive.deleteMany({ where: { orgId } });

      await tx.payment.deleteMany({ where: { orgId } });
      await tx.saleItem.deleteMany({ where: { orgId } });
      await tx.saleOrder.deleteMany({ where: { orgId } });

      await tx.credential.deleteMany({ where: { orgId } });
      await tx.voucherBatch.deleteMany({ where: { orgId } });

      await tx.commissionPayout.deleteMany({ where: { orgId } });
      await tx.commissionRule.deleteMany({ where: { orgId } });

      await tx.dailyRadiusUsageStat.deleteMany({ where: { orgId } });
      await tx.dailySalesStat.deleteMany({ where: { orgId } });
      await tx.monthlySalesStat.deleteMany({ where: { orgId } });
      await tx.yearlySalesStat.deleteMany({ where: { orgId } });

      await tx.rptFinPosting.deleteMany({ where: { orgId } });
      await tx.rptFinAttestation.deleteMany({ where: { orgId } });
      await tx.rptFinSettlementLine.deleteMany({ where: { orgId } });
      await tx.rptFinSettlement.deleteMany({ where: { orgId } });
      await tx.rptFinSourceCoverage.deleteMany({ where: { orgId } });

      await tx.orgInvoicePayment.deleteMany({ where: { orgId } });
      await tx.orgInvoiceItem.deleteMany({ where: { orgId } });
      await tx.orgInvoice.deleteMany({ where: { orgId } });
      await tx.orgLicenseHistory.deleteMany({ where: { orgId } });
      await tx.orgLicenseStationSizePrice.deleteMany({ where: { orgId } });
      await tx.orgLicense.deleteMany({ where: { orgId } });

      await tx.planPrice.deleteMany({ where: { orgId } });
      await tx.planPriceBook.deleteMany({ where: { orgId } });
      await tx.planRadiusAttribute.deleteMany({ where: { orgId } });
      await tx.resellerPlanEntitlement.deleteMany({ where: { orgId } });
      await tx.plan.deleteMany({ where: { orgId } });

      await tx.radiusVendorProfileSupportedAttribute.deleteMany({ where: { orgId } });
      await tx.routerSupportedAttribute.deleteMany({ where: { orgId } });

      await tx.resellerStation.deleteMany({ where: { orgId } });
      await tx.orgMemberStation.deleteMany({ where: { orgId } });
      await tx.orgMemberRole.deleteMany({ where: { orgId } });
      await tx.orgMember.deleteMany({ where: { orgId } });

      await tx.wifiAuditLog.deleteMany({ where: { orgId } });
      await tx.stationDevice.deleteMany({ where: { orgId } });

      await tx.wifiStation.updateMany({ where: { orgId }, data: { adminId: null } });
      await tx.reseller.updateMany({ where: { orgId }, data: { adminId: null } });
      await tx.org.update({ where: { id: orgId }, data: { adminId: null } });

      await tx.wifiStation.updateMany({
        where: { orgId },
        data: { radiusVendorProfileId: null },
      });
      await tx.radiusVendorProfile.deleteMany({ where: { orgId } });
      await tx.reseller.deleteMany({ where: { orgId } });
      await tx.wifiStation.deleteMany({ where: { orgId } });
      await tx.org.delete({ where: { id: orgId } });
    },
    { maxWait: 60_000, timeout: 600_000 },
  );

  const deletedAdmins = await deleteOrphanMigratedAdmins(prisma, [...linkedAdminIds]);

  return { orgId, orgCode: org.code, deletedAdmins };
}

async function deleteOrphanMigratedAdmins(
  prisma: PrismaClient,
  candidateIds: string[],
): Promise<number> {
  if (!candidateIds.length) return 0;

  const stillLinked = new Set<string>();
  const [orgLinks, stationLinks, resellerLinks, memberLinks] = await Promise.all([
    prisma.org.findMany({
      where: { adminId: { in: candidateIds } },
      select: { adminId: true },
    }),
    prisma.wifiStation.findMany({
      where: { adminId: { in: candidateIds } },
      select: { adminId: true },
    }),
    prisma.reseller.findMany({
      where: { adminId: { in: candidateIds } },
      select: { adminId: true },
    }),
    prisma.orgMember.findMany({
      where: { adminId: { in: candidateIds }, deletedAt: null },
      select: { adminId: true },
    }),
  ]);
  for (const row of orgLinks) if (row.adminId) stillLinked.add(row.adminId);
  for (const row of stationLinks) if (row.adminId) stillLinked.add(row.adminId);
  for (const row of resellerLinks) if (row.adminId) stillLinked.add(row.adminId);
  for (const row of memberLinks) stillLinked.add(row.adminId);

  const deletableIds = candidateIds.filter((id) => !stillLinked.has(id));
  if (!deletableIds.length) return 0;

  const admins = await prisma.admin.findMany({
    where: { id: { in: deletableIds } },
    select: { id: true, username: true },
  });
  const ids = admins
    .filter((a) => !PROTECTED_USERNAMES.has(a.username.toLowerCase()))
    .map((a) => a.id);
  if (!ids.length) return 0;

  await prisma.orgMemberRole.deleteMany({
    where: { orgMember: { adminId: { in: ids } } },
  });
  await prisma.orgMemberStation.deleteMany({
    where: { orgMember: { adminId: { in: ids } } },
  });
  await prisma.orgMember.deleteMany({ where: { adminId: { in: ids } } });
  await prisma.orgLicenseHistory.deleteMany({ where: { changedByAdminId: { in: ids } } });
  await prisma.orgInvoicePayment.deleteMany({ where: { receivedByAdminId: { in: ids } } });
  await prisma.wifiAuditLog.updateMany({
    where: { adminId: { in: ids } },
    data: { adminId: null },
  });
  await prisma.adminToken.deleteMany({ where: { adminId: { in: ids } } });

  const result = await prisma.admin.deleteMany({ where: { id: { in: ids } } });
  return result.count;
}
