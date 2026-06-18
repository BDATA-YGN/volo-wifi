import type { PrismaClient } from '@/generated/prisma/client';
import { CustomException } from '@/utils/exception';
import { hasGlobalOrgAccess, type AdminLike } from './resolve-org';

const INACTIVE_MEMBERSHIP_STATUSES = new Set(['SUSPENDED', 'DISABLED']);

function membershipBlockedMessage(statuses: string[]): string {
  const hasSuspended = statuses.includes('SUSPENDED');
  const hasDisabled = statuses.includes('DISABLED');

  if (hasSuspended && !hasDisabled) {
    return 'Your organization membership is suspended. Contact your organization administrator.';
  }
  if (hasDisabled && !hasSuspended) {
    return 'Your organization membership has been disabled. Contact your organization administrator.';
  }
  return 'Your organization membership is not active. Contact your organization administrator.';
}

/**
 * Blocks console sign-in and API access for wifi org team accounts whose
 * `OrgMember.status` is SUSPENDED or DISABLED on every linked membership.
 * Platform operators (Developer / Admin / super) are exempt.
 */
export async function assertOrgMembershipAllowsConsoleAccess(
  prisma: PrismaClient,
  adminId: string,
  user?: AdminLike | null
): Promise<void> {
  if (user && hasGlobalOrgAccess(user)) {
    return;
  }

  const memberships = await prisma.orgMember.findMany({
    where: { adminId, deletedAt: null },
    select: { status: true },
  });

  if (memberships.length === 0) {
    return;
  }

  const hasActiveMembership = memberships.some((row) => row.status === 'ACTIVE');
  if (hasActiveMembership) {
    return;
  }

  const inactiveStatuses = memberships
    .map((row) => row.status)
    .filter((status) => INACTIVE_MEMBERSHIP_STATUSES.has(status));

  throw new CustomException(
    403,
    'MEMBERSHIP_INACTIVE',
    membershipBlockedMessage(inactiveStatuses.length ? inactiveStatuses : memberships.map((m) => m.status))
  );
}

/** Ends active console sessions when the admin has no ACTIVE org memberships left. */
export async function revokeConsoleSessionsIfFullyBlocked(
  prisma: PrismaClient,
  adminId: string
): Promise<void> {
  const memberships = await prisma.orgMember.findMany({
    where: { adminId, deletedAt: null },
    select: { status: true },
  });

  if (memberships.length === 0) {
    return;
  }

  const hasActiveMembership = memberships.some((row) => row.status === 'ACTIVE');
  if (hasActiveMembership) {
    return;
  }

  await prisma.adminToken.updateMany({
    where: { adminId, isValid: true, deletedAt: null },
    data: { isValid: false, updatedAt: new Date() },
  });
  await prisma.admin.update({
    where: { id: adminId },
    data: { isOnline: false },
  });
}
