import { Prisma, RadiusAcctStatus, type Plan } from '@/generated/prisma/client';
import {
  billedSessionSeconds,
  planTimeQuotaSec,
  planHasTimeQuota,
  radiusSessionUsageWhere,
  radiusUserNameVariants,
} from '@/features/shared/credentials/credential-sync.helpers';

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
    select: {
      id: true,
      status: true,
      username: true,
      token: true,
      activatedAt: true,
      expiresAt: true,
      plan: {
        select: {
          quotaType: true,
          timeAmount: true,
          timeUnit: true,
          timeUsageMode: true,
        },
      },
    },
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
  const sessionOr: Prisma.RadiusSessionWhereInput[] = [];
  if (userNameVariants.length > 0) {
    sessionOr.push({ userName: { in: userNameVariants } });
  }

  const ended =
    sessionOr.length > 0
      ? await tx.radiusSession.updateMany({
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
        })
      : { count: 0 };

  const since = new Date(now.getTime() - PORTAL_LOGIN_SLOT_MS);
  const cleared =
    userNameVariants.length > 0
      ? await tx.captivePortalSession.deleteMany({
          where: {
            username: { in: userNameVariants },
            createdAt: { gte: since },
          },
        })
      : { count: 0 };

  return {
    endedRadiusSessions: ended.count,
    clearedPortalSessions: cleared.count,
  };
}

/**
 * MikroTik copies Session-Timeout into Acct-Session-Time. Late accounting then
 * sets started_at = now − quota (e.g. 30 days). Rewind those rows to insert time
 * so remaining-time math can discard the fake NAS duration.
 */
async function repairBackdatedRadiusStarts(
  tx: Prisma.TransactionClient,
  credential: { id: string; username: string | null; token: string | null },
): Promise<number> {
  const names = radiusUserNameVariants(credential);
  if (names.length === 0) {
    return 0;
  }

  const result = await tx.$executeRaw`
    UPDATE wf_radius_session rs
    SET
      started_at = rs.created_at,
      updated_at = CURRENT_TIMESTAMP
    WHERE rs.started_at < rs.created_at - INTERVAL '120 seconds'
      AND rs.user_name IN (${Prisma.join(names)})
  `;
  return Number(result);
}

async function refreshTimeRemainingAfterRepair(
  tx: Prisma.TransactionClient,
  credential: {
    id: string;
    status: string;
    username: string | null;
    token: string | null;
    expiresAt: Date | null;
    plan: Pick<Plan, 'quotaType' | 'timeAmount' | 'timeUnit' | 'timeUsageMode'> | null;
  },
): Promise<void> {
  const plan = credential.plan;
  if (!plan || !planHasTimeQuota(plan)) {
    return;
  }
  const quotaSec = planTimeQuotaSec(plan);
  if (quotaSec == null) {
    return;
  }

  const sessions = await tx.radiusSession.findMany({
    where: radiusSessionUsageWhere(credential),
    select: {
      sessionTimeSec: true,
      startedAt: true,
      stoppedAt: true,
      createdAt: true,
      lastInterimAt: true,
    },
  });
  const now = new Date();
  let usedSec = 0;
  for (const session of sessions) {
    usedSec += billedSessionSeconds(
      session.sessionTimeSec,
      session.startedAt,
      session.stoppedAt ?? now,
      {
        createdAt: session.createdAt,
        stoppedAt: session.stoppedAt,
        lastInterimAt: session.lastInterimAt,
      },
    );
  }
  const remainingSec = Math.max(0, quotaSec - usedSec);
  const expired = credential.expiresAt != null && credential.expiresAt.getTime() < now.getTime();
  const restore =
    credential.status === 'CONSUMED' && remainingSec > 0 && !expired;

  await tx.credential.update({
    where: { id: credential.id },
    data: {
      timeRemainingSec: remainingSec,
      ...(restore ? { status: 'ACTIVATED' } : {}),
    },
  });
}

const SESSION_CLEARABLE = new Set(['ACTIVATED', 'PAUSED', 'CONSUMED']);

/**
 * Operator Clear Sessions: remove this token's session history from the token
 * page (captive logins + RADIUS hot/archive), not only the last 3-minute hold.
 */
async function purgeTokenSessionHistory(
  tx: Prisma.TransactionClient,
  params: {
    orgId: string;
    credential: { username: string | null; token: string | null };
  },
): Promise<{ endedRadiusSessions: number; clearedPortalSessions: number }> {
  const userNameVariants = radiusUserNameVariants(params.credential);
  if (userNameVariants.length === 0) {
    return { endedRadiusSessions: 0, clearedPortalSessions: 0 };
  }

  const [hot, archive, portal] = await Promise.all([
    tx.radiusSession.deleteMany({
      where: { userName: { in: userNameVariants } },
    }),
    tx.radiusSessionArchive.deleteMany({
      where: { userName: { in: userNameVariants } },
    }),
    tx.captivePortalSession.deleteMany({
      where: {
        orgId: params.orgId,
        username: { in: userNameVariants },
      },
    }),
  ]);

  return {
    endedRadiusSessions: hot.count + archive.count,
    clearedPortalSessions: portal.count,
  };
}

/**
 * Delete captive portal logins and RADIUS history for this token, then
 * recompute remaining time. CONSUMED tokens with leftover quota become ACTIVATED.
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

  const result = await purgeTokenSessionHistory(tx, {
    orgId: params.orgId,
    credential: existing,
  });
  await refreshTimeRemainingAfterRepair(tx, existing);
  return result;
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

  await repairBackdatedRadiusStarts(tx, existing);
  await softEndOpenRadiusSessions(tx, existing, 'Operator-RestoreActivated');
  await refreshTimeRemainingAfterRepair(tx, { ...existing, status: 'CONSUMED' });

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
