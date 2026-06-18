import { PrismaClient } from '@/generated/prisma/client';
import {
  isDeveloperAdmin,
  loadOrgMembershipOptions,
  resolveOrgIdForAdmin,
  type OrgMembershipOption,
} from '@/features/wifi/shared/resolve-org';

export type ResellerContext = {
  resellerId: string;
  orgId: string;
  mode: 'partner' | 'preview';
};

export type ResellerPickerRow = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type AdminUser = Parameters<typeof resolveOrgIdForAdmin>[2];

export async function resolveDirectReseller(
  prisma: PrismaClient,
  adminId: string
): Promise<ResellerContext | null> {
  const row = await prisma.reseller.findFirst({
    where: { adminId, deletedAt: null, status: 'ACTIVE' },
    select: { id: true, orgId: true },
  });
  if (!row) return null;
  return { resellerId: row.id, orgId: row.orgId, mode: 'partner' };
}

export async function resolveRoleScopedReseller(
  prisma: PrismaClient,
  adminId: string
): Promise<ResellerContext | null> {
  const row = await prisma.orgMemberRole.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      resellerId: { not: null },
      orgMember: { adminId, deletedAt: null, status: 'ACTIVE' },
    },
    select: {
      resellerId: true,
      orgMember: { select: { orgId: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  if (!row?.resellerId) return null;

  const reseller = await prisma.reseller.findFirst({
    where: { id: row.resellerId, deletedAt: null, status: 'ACTIVE' },
    select: { id: true, orgId: true },
  });
  if (!reseller) return null;

  return { resellerId: reseller.id, orgId: reseller.orgId, mode: 'partner' };
}

export async function loadResellerPicker(
  prisma: PrismaClient,
  orgId: string
): Promise<ResellerPickerRow[]> {
  return prisma.reseller.findMany({
    where: { orgId, deletedAt: null },
    select: { id: true, code: true, name: true, status: true },
    orderBy: { name: 'asc' },
  });
}

function assertPartnerResellerAccess(
  linked: ResellerContext,
  requestedResellerId: string
): ResellerContext {
  if (requestedResellerId && requestedResellerId !== linked.resellerId) {
    throw Object.assign(new Error('You do not have access to this partner account.'), {
      status: 403,
      code: 'FORBIDDEN_RESELLER',
    });
  }
  return linked;
}

export async function resolveResellerContext(
  prisma: PrismaClient,
  adminId: string,
  user: AdminUser,
  query: { orgId?: string; resellerId?: string }
): Promise<
  | ResellerContext
  | { requiresResellerSelection: true; orgId: string; resellers: ResellerPickerRow[] }
  | { requiresOrgSelection: true; memberships: OrgMembershipOption[] }
> {
  const requestedResellerId = query.resellerId?.trim() ?? '';
  const requestedOrgId = query.orgId?.trim() ?? '';

  const direct = await resolveDirectReseller(prisma, adminId);
  if (direct) {
    return assertPartnerResellerAccess(direct, requestedResellerId);
  }

  const scoped = await resolveRoleScopedReseller(prisma, adminId);
  if (scoped) {
    return assertPartnerResellerAccess(scoped, requestedResellerId);
  }

  let orgId = requestedOrgId;
  if (!orgId) {
    const resolved = await resolveOrgIdForAdmin(prisma, adminId, user, undefined);
    if ('requiresSelection' in resolved) {
      return { requiresOrgSelection: true, memberships: resolved.memberships };
    }
    orgId = resolved.orgId;
  } else {
    const allowed = await resolveOrgIdForAdmin(prisma, adminId, user, orgId);
    if ('requiresSelection' in allowed) {
      throw Object.assign(new Error('You do not have access to this organization.'), {
        status: 403,
        code: 'FORBIDDEN_ORG',
      });
    }
    orgId = allowed.orgId;
  }

  if (requestedResellerId) {
    const reseller = await prisma.reseller.findFirst({
      where: { id: requestedResellerId, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!reseller) {
      throw Object.assign(new Error('Partner not found for this organization.'), {
        status: 404,
        code: 'NOT_FOUND',
      });
    }
    return { resellerId: requestedResellerId, orgId, mode: 'preview' };
  }

  const resellers = await loadResellerPicker(prisma, orgId);
  if (resellers.length === 1) {
    return { resellerId: resellers[0].id, orgId, mode: 'preview' };
  }

  return { requiresResellerSelection: true, orgId, resellers };
}

export async function loadOrgMembershipsForAdmin(
  prisma: PrismaClient,
  adminId: string,
  user: AdminUser
) {
  return loadOrgMembershipOptions(prisma, adminId, isDeveloperAdmin(user));
}
