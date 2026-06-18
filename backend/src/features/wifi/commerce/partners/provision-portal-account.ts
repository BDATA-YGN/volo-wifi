import type { Prisma } from '@/generated/prisma/client';
import { consoleUsernameTakenMessage } from '@/features/wifi/shared/conflict-messages';
import { hashPassword } from '@/utils/password';

export type ProvisionPortalAccountInput = {
  username: string;
  password: string;
  fullName: string;
  email?: string | null;
  phoneNumber?: string | null;
};

export type ProvisionPortalAccountResult = {
  adminId: string;
  username: string;
  orgMemberId: string;
};

export async function provisionPartnerPortalAccount(
  tx: Prisma.TransactionClient,
  params: {
    orgId: string;
    resellerId: string;
    actorAdminId: string;
    input: ProvisionPortalAccountInput;
  },
): Promise<ProvisionPortalAccountResult> {
  const { orgId, resellerId, actorAdminId, input } = params;
  const username = input.username.trim();

  const partnerRole = await tx.mngRoles.findFirst({
    where: { roleName: 'PARTNER', deletedAt: null },
    select: { roleId: true },
  });
  if (!partnerRole) {
    throw Object.assign(new Error('PARTNER console role is not configured.'), {
      status: 500,
      code: 'ROLE_NOT_FOUND',
    });
  }

  const reseller = await tx.reseller.findFirst({
    where: { id: resellerId, orgId, deletedAt: null },
    select: { id: true, adminId: true, name: true },
  });
  if (!reseller) {
    throw Object.assign(new Error('Partner not found.'), { status: 404, code: 'NOT_FOUND' });
  }
  if (reseller.adminId) {
    throw Object.assign(new Error('This partner already has a portal login.'), {
      status: 409,
      code: 'PORTAL_ACCOUNT_EXISTS',
    });
  }

  const existingAdmin = await tx.admin.findFirst({
    where: { username, deletedAt: null },
    select: { id: true },
  });
  if (existingAdmin) {
    throw Object.assign(new Error(consoleUsernameTakenMessage(username)), {
      status: 409,
      code: 'USERNAME_EXISTS',
    });
  }

  const hashedPassword = await hashPassword(input.password);
  const created = await tx.admin.create({
    data: {
      fullName: input.fullName.trim(),
      username,
      email: input.email?.trim() || null,
      phoneNumber: input.phoneNumber?.trim() || null,
      password: hashedPassword,
      roleId: partnerRole.roleId,
      isActive: true,
      isVerified: true,
      isBlocked: false,
      createdBy: actorAdminId,
    },
    select: { id: true },
  });
  const targetAdminId = created.id;

  let orgMember = await tx.orgMember.findFirst({
    where: { orgId, adminId: targetAdminId, deletedAt: null },
    select: { id: true },
  });

  if (!orgMember) {
    orgMember = await tx.orgMember.create({
      data: {
        orgId,
        adminId: targetAdminId,
        status: 'ACTIVE',
        isPrimary: false,
        title: reseller.name,
        createdByAdminId: actorAdminId,
        joinedAt: new Date(),
      },
      select: { id: true },
    });
  }

  const existingScopedRole = await tx.orgMemberRole.findFirst({
    where: {
      orgMemberId: orgMember.id,
      resellerId,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });

  if (!existingScopedRole) {
    await tx.orgMemberRole.create({
      data: {
        orgId,
        orgMemberId: orgMember.id,
        roleCode: 'PARTNER',
        resellerId,
        scopeKey: '',
        isActive: true,
        effectiveFrom: new Date(),
        assignedByAdminId: actorAdminId,
      },
    });
  }

  await tx.reseller.update({
    where: { id: resellerId },
    data: { adminId: targetAdminId },
  });

  return {
    adminId: targetAdminId,
    username,
    orgMemberId: orgMember.id,
  };
}
