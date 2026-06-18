import { PrismaClient } from '@/generated/prisma/client';
import {
  loadOrgMembershipOptions,
  resolveOrgIdForAdmin,
  type OrgMembershipOption,
} from '@/features/wifi/shared/resolve-org';
import {
  loadResellerPicker,
  resolveDirectReseller,
  resolveRoleScopedReseller,
  type ResellerPickerRow,
} from './resolve-reseller';

export type CommerceScope =
  | { mode: 'partner'; orgId: string; resellerId: string }
  | { mode: 'org'; orgId: string; resellerId?: string };

type AdminUser = Parameters<typeof resolveOrgIdForAdmin>[2];

export async function resolveCommerceScope(
  prisma: PrismaClient,
  adminId: string,
  user: AdminUser,
  query: { orgId?: string; resellerId?: string }
): Promise<
  | CommerceScope
  | { requiresResellerSelection: true; orgId: string; resellers: ResellerPickerRow[] }
  | { requiresOrgSelection: true; memberships: OrgMembershipOption[] }
> {
  const requestedResellerId = query.resellerId?.trim() ?? '';
  const requestedOrgId = query.orgId?.trim() ?? '';

  const direct = await resolveDirectReseller(prisma, adminId);
  if (direct) {
    if (requestedResellerId && requestedResellerId !== direct.resellerId) {
      throw Object.assign(new Error('You do not have access to this partner account.'), {
        status: 403,
        code: 'FORBIDDEN_RESELLER',
      });
    }
    return { mode: 'partner', orgId: direct.orgId, resellerId: direct.resellerId };
  }

  const scoped = await resolveRoleScopedReseller(prisma, adminId);
  if (scoped) {
    if (requestedResellerId && requestedResellerId !== scoped.resellerId) {
      throw Object.assign(new Error('You do not have access to this partner account.'), {
        status: 403,
        code: 'FORBIDDEN_RESELLER',
      });
    }
    return { mode: 'partner', orgId: scoped.orgId, resellerId: scoped.resellerId };
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
    return { mode: 'org', orgId, resellerId: requestedResellerId };
  }

  return { mode: 'org', orgId };
}

export { loadResellerPicker };
