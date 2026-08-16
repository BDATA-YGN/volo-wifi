import { PrismaClient } from '@/generated/prisma/client';
import { hasGlobalOrgAccess, type AdminLike } from './resolve-org';

/**
 * Station allow-list for the current admin in one org.
 * `null` = unrestricted (platform operator, org owner, or empty allow-list).
 * `string[]` = only these site ids (including empty when the list is set but none remain).
 */
export async function resolveAllowedStationIds(
  prisma: PrismaClient,
  adminId: string,
  orgId: string,
  user: AdminLike
): Promise<string[] | null> {
  if (hasGlobalOrgAccess(user)) return null;

  const member = await prisma.orgMember.findFirst({
    where: { orgId, adminId, deletedAt: null, status: 'ACTIVE' },
    select: {
      stationScopes: { select: { stationId: true } },
    },
  });

  // A configured allow-list always wins — including for the org owner account.
  if (member && member.stationScopes.length > 0) {
    return [...new Set(member.stationScopes.map((row) => row.stationId))];
  }

  return null;
}

export function stationPkScope(allowedIds: string[] | null): { id?: { in: string[] } } {
  if (!allowedIds) return {};
  return { id: { in: allowedIds } };
}

export function stationFkScope(allowedIds: string[] | null): { stationId?: { in: string[] } } {
  if (!allowedIds) return {};
  return { stationId: { in: allowedIds } };
}

/** Narrow a requested station id to the allow-list. `null` means reject the request. */
export function narrowStationId(
  requested: string | undefined,
  allowedIds: string[] | null
): { stationId?: string; forbidden?: boolean; scopedIds?: string[] } {
  if (!allowedIds) {
    return requested ? { stationId: requested } : {};
  }
  if (requested) {
    return allowedIds.includes(requested)
      ? { stationId: requested }
      : { forbidden: true };
  }
  return { scopedIds: allowedIds };
}

export async function loadAdminSiteAllowList(
  prisma: PrismaClient,
  adminId: string
): Promise<{ orgId: string; orgCode: string; stationIds: string[] }[]> {
  const members = await prisma.orgMember.findMany({
    where: { adminId, deletedAt: null, status: 'ACTIVE' },
    select: {
      orgId: true,
      org: { select: { code: true } },
      stationScopes: { select: { stationId: true } },
    },
  });

  return members
    .filter((row) => row.stationScopes.length > 0)
    .map((row) => ({
      orgId: row.orgId,
      orgCode: row.org.code,
      stationIds: [...new Set(row.stationScopes.map((scope) => scope.stationId))],
    }));
}
