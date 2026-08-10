/**
 * Repair partner portal logins from OLD cd_admin + wf_reseller CSV exports.
 *
 * Inserts missing tbl_admin rows (keeping legacy MD5 passwords), links
 * wf_reseller.admin_id, and ensures OrgMember + PARTNER OrgMemberRole.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register ./tools/repair-partner-portal-from-csv.ts
 *   npx ts-node -r tsconfig-paths/register ./tools/repair-partner-portal-from-csv.ts -- --apply
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { buildPgPoolConfig } from '../src/lib/pg-ssl';
import { resellerScopeKey, WIFI_ROLE } from '../src/prisma/data/migrate-from-volo/role-map';

type AdminRow = {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
  password: string;
  phoneNumber: string | null;
  isActive: boolean;
  isBlocked: boolean;
  isOnline: boolean;
  lastLogin: string | null;
  lastIp: string | null;
  joinDate: string;
  reporterCode: string;
  employmentType: string;
  createdAt: string;
};

type ResellerRow = {
  id: string;
  orgId: string;
  adminId: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
};

/** From volo_db_public_cd_admin.csv */
const ADMINS: AdminRow[] = [
  {
    id: 'db86573a-17c2-4470-bc3e-1e890de01c91',
    fullName: 'HninMyatKyaw',
    username: 'HMKAPC01',
    email: 'MBYAPC0001@gmail.com',
    password: 'db81140a96ae4273aac01d5ed42f2ac6',
    phoneNumber: '09',
    isActive: true,
    isBlocked: false,
    isOnline: true,
    lastLogin: '2026-08-09 15:40:23.491',
    lastIp: '172.70.208.137',
    joinDate: '2026-05-04 12:19:26.221',
    reporterCode: '0001',
    employmentType: 'full_time',
    createdAt: '2026-05-04 12:19:26.221',
  },
  {
    id: '236ab167-5b83-4065-8ea8-9add508fbe08',
    fullName: 'KhinAyeNwe',
    username: 'KANAPC01',
    email: 'MBYAPC0001@gmail.com',
    password: 'e5c7d5ab7b0d672931475c3e0766ed38',
    phoneNumber: '09',
    isActive: true,
    isBlocked: false,
    isOnline: true,
    lastLogin: '2026-08-09 07:58:38.141',
    lastIp: '162.158.88.125',
    joinDate: '2026-05-04 12:21:05.273',
    reporterCode: '0001',
    employmentType: 'full_time',
    createdAt: '2026-05-04 12:21:05.273',
  },
  {
    id: '05a404c1-e383-4b02-a45a-48b44dd7b13f',
    fullName: 'MRUPAC0001owner',
    username: 'MRUPAC0001owner',
    email: 'MRUPAC0001@gmail.com',
    password: '0204b656566d8cc8408d0bdb72709633',
    phoneNumber: '099',
    isActive: true,
    isBlocked: false,
    isOnline: true,
    lastLogin: '2026-08-10 07:05:01.324',
    lastIp: '172.69.166.24',
    joinDate: '2026-05-06 11:03:56.726',
    reporterCode: '0001',
    employmentType: 'full_time',
    createdAt: '2026-05-06 11:03:56.726',
  },
  {
    id: '0724db9f-dc92-49e9-9ee2-be6d0c78727c',
    fullName: 'MRUPAC0001',
    username: 'MRUPAC0001',
    email: 'MRUPAC0001@gmail.com',
    password: 'd03df1d4d3c601f5fb301bcb046da188',
    phoneNumber: '09',
    isActive: true,
    isBlocked: false,
    isOnline: true,
    lastLogin: '2026-05-21 03:55:05.861',
    lastIp: '172.70.189.43',
    joinDate: '2026-05-07 03:30:22.888',
    reporterCode: '0001',
    employmentType: 'full_time',
    createdAt: '2026-05-07 03:30:22.888',
  },
  {
    id: '1ebb10af-54a1-4155-9560-f6367361a8eb',
    fullName: 'AungMyoLwin',
    username: 'AMLAPC02',
    email: 'MPAPC0001@gmail.com',
    password: 'c74ddb7af26fe7d344530b4e53f88ab7',
    phoneNumber: '09',
    isActive: true,
    isBlocked: false,
    isOnline: true,
    lastLogin: '2026-08-09 10:47:53.449',
    lastIp: '172.71.124.45',
    joinDate: '2026-05-08 03:14:03.302',
    reporterCode: '0001',
    employmentType: 'full_time',
    createdAt: '2026-05-08 03:14:03.302',
  },
  {
    id: 'e6dbe3b0-4166-44f6-aa2b-d0af442c43cd',
    fullName: 'SaungHninWai',
    username: 'SHWAPC02',
    email: 'MPAPC0001@gmail.com',
    password: 'c384a090b7efc2121fe533fe2cac5224',
    phoneNumber: '098',
    isActive: true,
    isBlocked: false,
    isOnline: true,
    lastLogin: '2026-08-09 13:53:18.277',
    lastIp: '172.69.166.24',
    joinDate: '2026-05-08 03:18:27.865',
    reporterCode: '0001',
    employmentType: 'full_time',
    createdAt: '2026-05-08 03:18:27.865',
  },
  {
    id: '96c54cfb-7adb-47b4-8e5e-8c1729aade6f',
    fullName: 'OoMaungThein',
    username: 'OMTAPC02',
    email: 'MPAPC0001@gmail.com',
    password: '60a454317870487a820482bc8c206222',
    phoneNumber: '08',
    isActive: true,
    isBlocked: false,
    isOnline: true,
    lastLogin: '2026-05-22 07:00:23.699',
    lastIp: '172.71.82.115',
    joinDate: '2026-05-08 03:20:30.760',
    reporterCode: '0001',
    employmentType: 'full_time',
    createdAt: '2026-05-08 03:20:30.760',
  },
  {
    id: '63eb9d53-3a6f-4e07-8b3c-6d3095a10f79',
    fullName: 'WaiYanMin',
    username: 'WYMKPAC02',
    email: 'KTWPAC02@gmail.com',
    password: 'c8ff37c79b152ec2c6679de1fec70185',
    phoneNumber: '09',
    isActive: true,
    isBlocked: false,
    isOnline: true,
    lastLogin: '2026-06-21 02:49:48.329',
    lastIp: '172.71.124.45',
    joinDate: '2026-05-21 10:55:54.701',
    reporterCode: '0001',
    employmentType: 'full_time',
    createdAt: '2026-05-21 10:55:54.701',
  },
  {
    id: 'd11a569b-1b4f-4614-b176-26b351a5782b',
    fullName: 'ThuzarKhin',
    username: 'TZKANNPAC02',
    email: 'ANNPAC0002@gmail.com',
    password: '64fdc72733a61841718e63b2aae34d33',
    phoneNumber: '09',
    isActive: true,
    isBlocked: false,
    isOnline: true,
    lastLogin: '2026-08-10 03:19:09.942',
    lastIp: '172.70.208.136',
    joinDate: '2026-05-26 04:39:28.478',
    reporterCode: '0001',
    employmentType: 'full_time',
    createdAt: '2026-05-26 04:39:28.478',
  },
  {
    id: '370a08ae-d5ca-4399-82bb-a4137bd13335',
    fullName: 'SandarHlaing',
    username: 'SDHPAC03',
    email: 'KTWPAC0003@gmail.com',
    password: 'babb80c3dd5d8c132e6e65c3be1f9210',
    phoneNumber: '09',
    isActive: true,
    isBlocked: false,
    isOnline: true,
    lastLogin: '2026-08-10 05:18:00.710',
    lastIp: '162.158.171.30',
    joinDate: '2026-06-25 12:02:38.609',
    reporterCode: '0001',
    employmentType: 'full_time',
    createdAt: '2026-06-25 12:02:38.609',
  },
  {
    id: '9ed63e3c-2e76-4c62-8bc0-b7e37f0e01b2',
    fullName: 'Min Thein Tun(satff)',
    username: 'MTT',
    email: 'MRUPAC0022@gmail.com',
    password: '4fa3cdb0bdaa2316e5402c07159198ea',
    phoneNumber: '09',
    isActive: true,
    isBlocked: false,
    isOnline: true,
    lastLogin: '2026-08-10 04:54:44.118',
    lastIp: '104.23.175.42',
    joinDate: '2026-08-03 06:20:54.891',
    reporterCode: '0001',
    employmentType: 'full_time',
    createdAt: '2026-08-03 06:20:54.891',
  },
];

/** From volo_db_public_wf_reseller.csv */
const RESELLERS: ResellerRow[] = [
  {
    id: 'db282dd4-3762-42a3-84c1-a379108b656a',
    orgId: '13de7310-afb7-4740-b94e-2c31ee9e7f9c',
    adminId: 'db86573a-17c2-4470-bc3e-1e890de01c91',
    code: 'RS-054',
    name: 'HninMyatKyaw',
    status: 'ACTIVE',
  },
  {
    id: 'a6a5b1a1-78ae-4b79-a2a5-ce3650fb439f',
    orgId: '13de7310-afb7-4740-b94e-2c31ee9e7f9c',
    adminId: '236ab167-5b83-4065-8ea8-9add508fbe08',
    code: 'RS-055',
    name: 'KhinAyeNwe',
    status: 'ACTIVE',
  },
  {
    id: '966ea357-6da5-4bec-9358-98a3387dd5ca',
    orgId: '13de7310-afb7-4740-b94e-2c31ee9e7f9c',
    adminId: '05a404c1-e383-4b02-a45a-48b44dd7b13f',
    code: 'RS-065',
    name: 'MRUPACC0001owner',
    status: 'ACTIVE',
  },
  {
    id: '469a3271-ff7e-4e37-aadc-0505a2cc6ca5',
    orgId: '13de7310-afb7-4740-b94e-2c31ee9e7f9c',
    adminId: '0724db9f-dc92-49e9-9ee2-be6d0c78727c',
    code: 'RS-066',
    name: 'MRUPAC0001',
    status: 'DISABLED',
  },
  {
    id: '278aba64-1dc7-4710-b31a-671ec8f0dfd9',
    orgId: '13de7310-afb7-4740-b94e-2c31ee9e7f9c',
    adminId: '1ebb10af-54a1-4155-9560-f6367361a8eb',
    code: 'RS-073',
    name: 'AungMyoLwin',
    status: 'ACTIVE',
  },
  {
    id: 'aa0a02a4-61a1-41c8-9a76-0eb65b45bd18',
    orgId: '13de7310-afb7-4740-b94e-2c31ee9e7f9c',
    adminId: 'e6dbe3b0-4166-44f6-aa2b-d0af442c43cd',
    code: 'RS-074',
    name: 'SaungHninWai',
    status: 'ACTIVE',
  },
  {
    id: '83638541-487c-4133-9c79-d8b32914e467',
    orgId: '13de7310-afb7-4740-b94e-2c31ee9e7f9c',
    adminId: '96c54cfb-7adb-47b4-8e5e-8c1729aade6f',
    code: 'RS-075',
    name: 'OoMaungThein',
    status: 'DISABLED',
  },
  {
    id: 'be25ec90-78dd-4648-bfea-190d7ff16df1',
    orgId: '13de7310-afb7-4740-b94e-2c31ee9e7f9c',
    adminId: '63eb9d53-3a6f-4e07-8b3c-6d3095a10f79',
    code: 'RS-107',
    name: 'waiyan',
    status: 'ACTIVE',
  },
  {
    id: '8483adb0-fb06-47ff-b7aa-d17c9119c934',
    orgId: '13de7310-afb7-4740-b94e-2c31ee9e7f9c',
    adminId: 'd11a569b-1b4f-4614-b176-26b351a5782b',
    code: 'RS-119',
    name: 'ThuzarKhin',
    status: 'ACTIVE',
  },
  {
    id: '630b7059-7a00-4094-839b-3630207bff4d',
    orgId: '13de7310-afb7-4740-b94e-2c31ee9e7f9c',
    adminId: '370a08ae-d5ca-4399-82bb-a4137bd13335',
    code: 'RS-146',
    name: 'SandarHlaing(Staff)',
    status: 'ACTIVE',
  },
  {
    id: '142c6f66-e861-4ee6-8a8b-c668fc97387b',
    orgId: '13de7310-afb7-4740-b94e-2c31ee9e7f9c',
    adminId: '9ed63e3c-2e76-4c62-8bc0-b7e37f0e01b2',
    code: 'RS-273',
    name: 'Min Thein Tun(satff)',
    status: 'ACTIVE',
  },
];

function asDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

async function resolveUsername(
  prisma: PrismaClient,
  desired: string,
  adminId: string,
  resellerCode: string,
): Promise<{ username: string; renamed: boolean; conflictWith?: string }> {
  const existing = await prisma.admin.findUnique({
    where: { username: desired },
    select: { id: true, username: true, fullName: true },
  });
  if (!existing || existing.id === adminId) {
    return { username: desired, renamed: false };
  }
  const fallback = `${desired}_${resellerCode.replace(/-/g, '')}`;
  return {
    username: fallback,
    renamed: true,
    conflictWith: `${existing.username} (${existing.fullName}, ${existing.id})`,
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const pool = new Pool(buildPgPoolConfig(process.env.DATABASE_URL!));
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const partnerRole = await prisma.mngRoles.findFirst({
    where: { roleName: 'PARTNER', deletedAt: null },
    select: { roleId: true },
  });
  if (!partnerRole) {
    throw new Error('PARTNER role missing in tbl_mng_roles — seed roles first');
  }

  const adminById = new Map(ADMINS.map((a) => [a.id, a]));
  const results: Array<Record<string, string>> = [];

  console.log(apply ? 'APPLY mode' : 'DRY-RUN mode (pass --apply to write)');

  for (const rs of RESELLERS) {
    const adminSrc = adminById.get(rs.adminId);
    if (!adminSrc) {
      results.push({ code: rs.code, status: 'ERROR', detail: 'admin missing from CSV set' });
      continue;
    }

    const reseller = await prisma.reseller.findUnique({
      where: { id: rs.id },
      select: { id: true, code: true, adminId: true, orgId: true, name: true, status: true },
    });
    if (!reseller) {
      results.push({ code: rs.code, status: 'ERROR', detail: 'reseller not found in NEW db' });
      continue;
    }

    const { username, renamed, conflictWith } = await resolveUsername(
      prisma,
      adminSrc.username,
      adminSrc.id,
      rs.code,
    );

    const takenByOtherReseller = await prisma.reseller.findFirst({
      where: { adminId: adminSrc.id, NOT: { id: rs.id }, deletedAt: null },
      select: { id: true, code: true },
    });
    if (takenByOtherReseller) {
      results.push({
        code: rs.code,
        status: 'ERROR',
        detail: `admin ${adminSrc.id} already linked to ${takenByOtherReseller.code}`,
      });
      continue;
    }

    const memberStatus = reseller.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED';
    const detailParts = [
      `username=${username}`,
      renamed ? `renamed(from ${adminSrc.username}; conflict ${conflictWith})` : null,
      `adminId=${adminSrc.id}`,
      `memberStatus=${memberStatus}`,
    ].filter(Boolean);

    if (!apply) {
      results.push({
        code: rs.code,
        status: reseller.adminId === adminSrc.id ? 'OK_ALREADY' : 'WOULD_LINK',
        detail: detailParts.join('; '),
      });
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const existingAdmin = await tx.admin.findUnique({
        where: { id: adminSrc.id },
        select: { id: true },
      });

      const adminData = {
        fullName: adminSrc.fullName,
        username,
        email: adminSrc.email,
        password: adminSrc.password,
        roleId: partnerRole.roleId,
        phoneNumber: adminSrc.phoneNumber,
        isActive: adminSrc.isActive,
        isSuper: false,
        isVerified: true,
        isBlocked: adminSrc.isBlocked,
        isOnline: adminSrc.isOnline,
        lastLogin: asDate(adminSrc.lastLogin),
        lastIp: adminSrc.lastIp,
        joinDate: asDate(adminSrc.joinDate) ?? new Date(),
        reporterCode: adminSrc.reporterCode,
        employmentType: adminSrc.employmentType,
        updatedBy: 'repair-partner-portal-from-csv',
        deletedAt: null,
        emailAccountId: null,
      };

      if (existingAdmin) {
        await tx.admin.update({
          where: { id: adminSrc.id },
          data: adminData,
        });
      } else {
        await tx.admin.create({
          data: {
            id: adminSrc.id,
            createdBy: 'repair-partner-portal-from-csv',
            createdAt: asDate(adminSrc.createdAt) ?? new Date(),
            ...adminData,
          },
        });
      }

      await tx.reseller.update({
        where: { id: rs.id },
        data: { adminId: adminSrc.id },
      });

      let orgMember = await tx.orgMember.findFirst({
        where: { orgId: reseller.orgId, adminId: adminSrc.id, deletedAt: null },
        select: { id: true },
      });
      if (!orgMember) {
        orgMember = await tx.orgMember.create({
          data: {
            orgId: reseller.orgId,
            adminId: adminSrc.id,
            status: memberStatus,
            isPrimary: false,
            title: reseller.name,
            createdByAdminId: null,
            joinedAt: asDate(adminSrc.joinDate) ?? new Date(),
          },
          select: { id: true },
        });
      } else {
        await tx.orgMember.update({
          where: { id: orgMember.id },
          data: { status: memberStatus, title: reseller.name, deletedAt: null },
        });
      }

      const scopeKey = resellerScopeKey(rs.id);
      const existingRole = await tx.orgMemberRole.findFirst({
        where: {
          orgMemberId: orgMember.id,
          roleCode: WIFI_ROLE.PARTNER,
          scopeKey,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!existingRole) {
        await tx.orgMemberRole.create({
          data: {
            orgId: reseller.orgId,
            orgMemberId: orgMember.id,
            roleCode: WIFI_ROLE.PARTNER,
            resellerId: rs.id,
            scopeKey,
            isActive: true,
            effectiveFrom: new Date(),
            assignedByAdminId: null,
          },
        });
      } else {
        await tx.orgMemberRole.update({
          where: { id: existingRole.id },
          data: { isActive: true, resellerId: rs.id, deletedAt: null },
        });
      }
    });

    results.push({
      code: rs.code,
      status: 'LINKED',
      detail: detailParts.join('; '),
    });
  }

  console.table(results);

  if (apply) {
    const verify = await prisma.reseller.findMany({
      where: { id: { in: RESELLERS.map((r) => r.id) } },
      select: {
        code: true,
        name: true,
        adminId: true,
        admin: { select: { username: true, isActive: true } },
      },
      orderBy: { code: 'asc' },
    });
    console.log('\nVerification:');
    console.table(
      verify.map((r) => ({
        code: r.code,
        name: r.name,
        username: r.admin?.username ?? '—',
        adminActive: r.admin?.isActive ?? false,
        linked: Boolean(r.adminId),
      })),
    );
  } else {
    console.log('\nRe-run with --apply to write changes.');
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
