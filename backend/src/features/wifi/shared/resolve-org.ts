import { PrismaClient } from '@/generated/prisma/client';

export type OrgMembershipOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  isPrimary: boolean;
};

type AdminLike = {
  isSuper?: boolean;
  role?: { roleName?: string | null } | null;
};

export function isDeveloperAdmin(user: AdminLike): boolean {
  const roleName = user.role?.roleName?.toLowerCase();
  return user.isSuper === true || roleName === 'developer';
}

export function isPlatformAdmin(user: AdminLike): boolean {
  return user.role?.roleName?.toLowerCase() === 'admin';
}

/** Platform console roles that may browse any tenant on behalf of org members. */
export function isPlatformOperator(user: AdminLike): boolean {
  return isDeveloperAdmin(user) || isPlatformAdmin(user);
}

export function hasGlobalOrgAccess(user: AdminLike): boolean {
  return isPlatformOperator(user);
}

/** Org picker is for developer (and isSuper) only — tenant accounts stay scoped to their membership. */
export function canSwitchOrgContext(user: AdminLike): boolean {
  return isDeveloperAdmin(user);
}

export async function loadOrgMembershipOptions(
  prisma: PrismaClient,
  adminId: string,
  globalOrgAccess: boolean
): Promise<OrgMembershipOption[]> {
  if (globalOrgAccess) {
    const orgs = await prisma.org.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, isActive: true },
      orderBy: { name: 'asc' },
    });
    return orgs.map((org) => ({
      ...org,
      isPrimary: false,
    }));
  }

  const [ownedOrgs, memberships] = await Promise.all([
    prisma.org.findMany({
      where: { adminId, deletedAt: null },
      select: { id: true, code: true, name: true, isActive: true },
    }),
    prisma.orgMember.findMany({
      where: { adminId, deletedAt: null, status: 'ACTIVE' },
      select: {
        isPrimary: true,
        org: { select: { id: true, code: true, name: true, isActive: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    }),
  ]);

  const map = new Map<string, OrgMembershipOption>();

  for (const org of ownedOrgs) {
    map.set(org.id, { ...org, isPrimary: true });
  }

  for (const row of memberships) {
    const existing = map.get(row.org.id);
    map.set(row.org.id, {
      ...row.org,
      isPrimary: existing?.isPrimary || row.isPrimary,
    });
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function canAccessOrg(
  prisma: PrismaClient,
  adminId: string,
  orgId: string,
  globalOrgAccess: boolean
): Promise<boolean> {
  if (globalOrgAccess) {
    const org = await prisma.org.findFirst({
      where: { id: orgId, deletedAt: null },
      select: { id: true },
    });
    return Boolean(org);
  }

  const [owned, member] = await Promise.all([
    prisma.org.findFirst({
      where: { id: orgId, adminId, deletedAt: null },
      select: { id: true },
    }),
    prisma.orgMember.findFirst({
      where: { orgId, adminId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    }),
  ]);

  return Boolean(owned || member);
}

export async function resolveOrgIdForAdmin(
  prisma: PrismaClient,
  adminId: string,
  user: AdminLike,
  requestedOrgId?: string
): Promise<{ orgId: string } | { memberships: OrgMembershipOption[]; requiresSelection: true }> {
  const globalAccess = hasGlobalOrgAccess(user);
  const memberships = await loadOrgMembershipOptions(prisma, adminId, globalAccess);

  if (requestedOrgId) {
    const allowed = await canAccessOrg(prisma, adminId, requestedOrgId, globalAccess);
    if (!allowed) {
      throw Object.assign(new Error('You do not have access to this organization.'), {
        status: 403,
        code: 'FORBIDDEN_ORG',
      });
    }
    return { orgId: requestedOrgId };
  }

  // Developers must explicitly pick a working organization (no auto-scope).
  if (canSwitchOrgContext(user)) {
    return { memberships, requiresSelection: true };
  }

  if (memberships.length === 1) {
    return { orgId: memberships[0].id };
  }

  const primary = memberships.find((m) => m.isPrimary);
  if (primary) {
    return { orgId: primary.id };
  }

  if (memberships.length > 1) {
    return { orgId: memberships[0].id };
  }

  throw Object.assign(new Error('No organization is linked to your account.'), {
    status: 404,
    code: 'NO_ORG',
  });
}
