import { Prisma, type Plan } from '@/generated/prisma/client';
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
      soldAt: true,
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

  const endedCount =
    userNameVariants.length > 0
      ? Number(
          await tx.$executeRaw`
            UPDATE wf_radius_session
            SET
              status = 'STOP'::"RadiusAcctStatus",
              stopped_at = COALESCE(last_interim_at, created_at, started_at),
              terminate_cause = ${terminateCause},
              updated_at = CURRENT_TIMESTAMP
            WHERE stopped_at IS NULL
              AND status IN ('START'::"RadiusAcctStatus", 'INTERIM'::"RadiusAcctStatus")
              AND user_name IN (${Prisma.join(userNameVariants)})
          `,
        )
      : 0;

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
    endedRadiusSessions: endedCount,
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
 * Fix incorrect RADIUS timestamps for this token. Does not delete history
 * and does not invent sessionTimeSec. STOP rows snap to last_interim_at;
 * started_at cannot be before the token was sold/activated.
 */
export async function clearAccessTokenSessions(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string }
): Promise<{ endedRadiusSessions: number; clearedPortalSessions: number }> {
  const existing = await loadCredentialForSessionOps(tx, params);

  if (!SESSION_CLEARABLE.has(existing.status)) {
    throw Object.assign(
      new Error(`Sessions cannot be fixed while the token is ${existing.status}.`),
      { status: 409, code: 'CANNOT_CLEAR_SESSIONS' },
    );
  }

  const names = radiusUserNameVariants(existing);
  let radiusFixed = 0;
  if (names.length > 0) {
    const hot = await tx.$executeRaw`
      UPDATE wf_radius_session rs
      SET
        started_at = GREATEST(
          rs.started_at,
          rs.created_at,
          COALESCE(c.activated_at, c.sold_at, c.created_at, rs.started_at)
        ),
        stopped_at = CASE
          WHEN rs.status = 'STOP'::"RadiusAcctStatus" OR rs.stopped_at IS NOT NULL
          THEN COALESCE(rs.last_interim_at, rs.created_at, rs.started_at)
          ELSE rs.stopped_at
        END,
        updated_at = CURRENT_TIMESTAMP
      FROM wf_credential c
      WHERE c.id = ${existing.id}
        AND rs.user_name IN (${Prisma.join(names)})
    `;
    const archive = await tx.$executeRaw`
      UPDATE wf_radius_session_archive rs
      SET
        started_at = GREATEST(
          rs.started_at,
          COALESCE(c.activated_at, c.sold_at, c.created_at, rs.started_at)
        ),
        stopped_at = COALESCE(rs.last_interim_at, rs.stopped_at, rs.started_at)
      FROM wf_credential c
      WHERE c.id = ${existing.id}
        AND rs.user_name IN (${Prisma.join(names)})
    `;
    radiusFixed = Number(hot) + Number(archive);
  }

  await refreshTimeRemainingAfterRepair(tx, existing);
  return { endedRadiusSessions: radiusFixed, clearedPortalSessions: 0 };
}

export type TokenSessionSource = 'hot' | 'archive' | 'captive';

/**
 * Developer-only: delete one captive or RADIUS session row, then recompute remaining.
 */
export async function deleteAccessTokenSession(
  tx: Prisma.TransactionClient,
  params: {
    orgId: string;
    resellerId: string;
    credentialId: string;
    sessionId: string;
    source: TokenSessionSource;
  },
): Promise<void> {
  const existing = await loadCredentialForSessionOps(tx, params);
  const names = radiusUserNameVariants(existing);
  if (names.length === 0) {
    throw Object.assign(new Error('Session not found.'), { status: 404, code: 'NOT_FOUND' });
  }

  if (params.source === 'captive') {
    const deleted = await tx.captivePortalSession.deleteMany({
      where: {
        id: params.sessionId,
        orgId: params.orgId,
        username: { in: names },
      },
    });
    if (deleted.count === 0) {
      throw Object.assign(new Error('Session not found.'), { status: 404, code: 'NOT_FOUND' });
    }
  } else if (params.source === 'archive') {
    const deleted = await tx.radiusSessionArchive.deleteMany({
      where: { id: params.sessionId, userName: { in: names } },
    });
    if (deleted.count === 0) {
      throw Object.assign(new Error('Session not found.'), { status: 404, code: 'NOT_FOUND' });
    }
  } else {
    const deleted = await tx.radiusSession.deleteMany({
      where: { id: params.sessionId, userName: { in: names } },
    });
    if (deleted.count === 0) {
      throw Object.assign(new Error('Session not found.'), { status: 404, code: 'NOT_FOUND' });
    }
  }

  await refreshTimeRemainingAfterRepair(tx, existing);
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
