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

async function loadCredentialForSessionOps(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string }
) {
  const existing = await tx.credential.findFirst({
    where: { id: params.credentialId, orgId: params.orgId, resellerId: params.resellerId, deletedAt: null },
    select: { id: true, status: true, username: true, token: true, activatedAt: true, expiresAt: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Access token not found.'), { status: 404, code: 'NOT_FOUND' });
  }

  return existing;
}

async function softEndOpenRadiusSessions(
  tx: Prisma.TransactionClient,
  credential: { id: string; username: string | null; token: string | null },
  terminateCause: string
): Promise<{ endedRadiusSessions: number; clearedPortalSessions: number }> {
  const now = new Date();
  const userNameVariants = radiusUserNameVariants(credential);
  const sessionOr: Prisma.RadiusSessionWhereInput[] = [{ credentialId: credential.id }];
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
      terminateCause,
      updatedAt: now,
    },
  });

  const since = new Date(now.getTime() - PORTAL_LOGIN_SLOT_MS);
  const cleared = await tx.captivePortalSession.deleteMany({
    where: {
      credentialId: credential.id,
      createdAt: { gte: since },
    },
  });

  return {
    endedRadiusSessions: ended.count,
    clearedPortalSessions: cleared.count,
  };
}

const SESSION_CLEARABLE = new Set(['ACTIVATED', 'PAUSED', 'CONSUMED']);

/**
 * Soft-end open RADIUS rows and recent portal holds. Does not change token status.
 */
export async function clearAccessTokenSessions(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string }
): Promise<{ endedRadiusSessions: number; clearedPortalSessions: number }> {
  const existing = await loadCredentialForSessionOps(tx, params);

  if (!SESSION_CLEARABLE.has(existing.status)) {
    throw Object.assign(
      new Error(`Sessions cannot be cleared while the token is ${existing.status}.`),
      { status: 409, code: 'CANNOT_CLEAR_SESSIONS' },
    );
  }

  return softEndOpenRadiusSessions(tx, existing, 'Operator-ClearSessions');
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
  const existing = await loadCredentialForSessionOps(tx, params);

  if (existing.status !== 'ACTIVATED') {
    throw Object.assign(
      new Error('Allow new device is only available for activated tokens.'),
      { status: 409, code: 'CANNOT_ALLOW_NEW_DEVICE' },
    );
  }

  return softEndOpenRadiusSessions(tx, existing, 'Operator-AllowNewDevice');
}

export async function restoreConsumedAccessToken(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string }
): Promise<void> {
  const existing = await loadCredentialForSessionOps(tx, params);

  if (existing.status !== 'CONSUMED') {
    throw Object.assign(new Error(`Tokens in status ${existing.status} cannot be restored to activated.`), {
      status: 409,
      code: 'CANNOT_RESTORE',
    });
  }

  await softEndOpenRadiusSessions(tx, existing, 'Operator-RestoreActivated');

  const now = new Date();
  const expired = existing.expiresAt != null && existing.expiresAt.getTime() < now.getTime();
  await tx.credential.update({
    where: { id: existing.id },
    data: {
      status: expired ? 'EXPIRED' : 'ACTIVATED',
      activatedAt: expired ? existing.activatedAt : (existing.activatedAt ?? now),
    },
  });
}

export async function revertAccessTokenToSold(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string }
): Promise<void> {
  const existing = await loadCredentialForSessionOps(tx, params);

  const revertable = new Set(['ACTIVATED', 'PAUSED', 'CONSUMED']);
  if (!revertable.has(existing.status)) {
    throw Object.assign(new Error(`Tokens in status ${existing.status} cannot be reverted to sold.`), {
      status: 409,
      code: 'CANNOT_REVERT',
    });
  }

  await softEndOpenRadiusSessions(tx, existing, 'Operator-RevertToSold');

  await tx.credential.update({
    where: { id: existing.id },
    data: {
      status: 'SOLD',
      activatedAt: null,
      singleSessionResellerUnlockAt: null,
    },
  });
}
