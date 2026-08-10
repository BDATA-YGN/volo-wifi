import type { Prisma } from '@/generated/prisma/client';
import { RadiusAcctStatus } from '@/generated/prisma/client';
import { radiusUserNameVariants } from '@/features/shared/credentials/credential-sync.helpers';

const PAUSABLE = new Set(['ACTIVATED']);

/** Matches captive login portal slot hold in login-guards.ts */
const PORTAL_LOGIN_SLOT_MS = 3 * 60 * 1000;

export async function pauseAccessToken(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string }
): Promise<void> {
  const existing = await tx.credential.findFirst({
    where: { id: params.credentialId, orgId: params.orgId, resellerId: params.resellerId, deletedAt: null },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Access token not found.'), { status: 404, code: 'NOT_FOUND' });
  }

  if (!PAUSABLE.has(existing.status)) {
    throw Object.assign(new Error(`Tokens in status ${existing.status} cannot be paused.`), {
      status: 409,
      code: 'CANNOT_PAUSE',
    });
  }

  await tx.credential.update({
    where: { id: existing.id },
    data: { status: 'PAUSED' },
  });
}

export async function unlockAccessToken(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string }
): Promise<void> {
  const existing = await tx.credential.findFirst({
    where: { id: params.credentialId, orgId: params.orgId, resellerId: params.resellerId, deletedAt: null },
    select: { id: true, status: true, activatedAt: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Access token not found.'), { status: 404, code: 'NOT_FOUND' });
  }

  if (existing.status !== 'PAUSED') {
    throw Object.assign(new Error(`Tokens in status ${existing.status} cannot be unlocked.`), {
      status: 409,
      code: 'CANNOT_UNLOCK',
    });
  }

  const now = new Date();
  await tx.credential.update({
    where: { id: existing.id },
    data: {
      status: 'ACTIVATED',
      activatedAt: existing.activatedAt ?? now,
      singleSessionResellerUnlockAt: now,
    },
  });
}

/**
 * Free device slots so a different MAC can captive-login.
 * Soft-ends open RADIUS sessions and clears recent portal session holds.
 * Does not change status or plan maxDevices.
 */
export async function allowNewDeviceAccessToken(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string }
): Promise<{ endedRadiusSessions: number; clearedPortalSessions: number }> {
  const existing = await tx.credential.findFirst({
    where: { id: params.credentialId, orgId: params.orgId, resellerId: params.resellerId, deletedAt: null },
    select: { id: true, status: true, username: true, token: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Access token not found.'), { status: 404, code: 'NOT_FOUND' });
  }

  if (existing.status !== 'ACTIVATED') {
    throw Object.assign(
      new Error('Allow new device is only available for activated tokens.'),
      { status: 409, code: 'CANNOT_ALLOW_NEW_DEVICE' },
    );
  }

  const now = new Date();
  const userNameVariants = radiusUserNameVariants(existing);
  const sessionOr: Prisma.RadiusSessionWhereInput[] = [{ credentialId: existing.id }];
  if (userNameVariants.length > 0) {
    sessionOr.push({ userName: { in: userNameVariants } });
  }

  const ended = await tx.radiusSession.updateMany({
    where: {
      OR: sessionOr,
      status: { in: [RadiusAcctStatus.START, RadiusAcctStatus.INTERIM] },
      stoppedAt: null,
    },
    data: {
      stoppedAt: now,
      status: RadiusAcctStatus.STOP,
      terminateCause: 'Operator-AllowNewDevice',
      updatedAt: now,
    },
  });

  const since = new Date(now.getTime() - PORTAL_LOGIN_SLOT_MS);
  const cleared = await tx.captivePortalSession.deleteMany({
    where: {
      credentialId: existing.id,
      createdAt: { gte: since },
    },
  });

  return {
    endedRadiusSessions: ended.count,
    clearedPortalSessions: cleared.count,
  };
}

export async function revertAccessTokenToSold(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string }
): Promise<void> {
  const existing = await tx.credential.findFirst({
    where: { id: params.credentialId, orgId: params.orgId, resellerId: params.resellerId, deletedAt: null },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Access token not found.'), { status: 404, code: 'NOT_FOUND' });
  }

  const revertable = new Set(['ACTIVATED', 'PAUSED']);
  if (!revertable.has(existing.status)) {
    throw Object.assign(new Error(`Tokens in status ${existing.status} cannot be reverted to sold.`), {
      status: 409,
      code: 'CANNOT_REVERT',
    });
  }

  await tx.credential.update({
    where: { id: existing.id },
    data: {
      status: 'SOLD',
      activatedAt: null,
      singleSessionResellerUnlockAt: null,
    },
  });
}
