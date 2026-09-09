import { Prisma, type Plan } from '@/generated/prisma/client';
import {
  billedSessionSeconds,
  IMPLAUSIBLE_ACCT_SESSION_SEC,
  LEFTOVER_HOST_SESSION_SEC,
  planTimeQuotaSec,
  planHasTimeQuota,
  radiusSessionUsageWhere,
  radiusUserNameVariants,
  endOpenRadiusSessionsForUser,
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
      createdAt: true,
      plan: {
        select: {
          quotaType: true,
          timeAmount: true,
          timeUnit: true,
          timeUsageMode: true,
          maxDevices: true,
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
  terminateCause: string,
): Promise<{ endedRadiusSessions: number; clearedPortalSessions: number }> {
  const since = new Date(Date.now() - PORTAL_LOGIN_SLOT_MS);
  return endOpenRadiusSessionsForUser(tx, credential, terminateCause, {
    portalSince: since,
  });
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
    activatedAt?: Date | null;
    expiresAt: Date | null;
    plan: Pick<Plan, 'quotaType' | 'timeAmount' | 'timeUnit' | 'timeUsageMode' | 'maxDevices'> | null;
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
  if (credential.activatedAt) {
    const elapsedSec = Math.max(
      0,
      Math.floor((now.getTime() - credential.activatedAt.getTime()) / 1000),
    );
    usedSec = Math.min(usedSec, Math.max(1, plan.maxDevices ?? 1) * elapsedSec);
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
 * Fix incorrect RADIUS timestamps and leftover hotspot-host rows.
 * Does not delete history. Leftover NAS (>24h MikroTik host uptime) is
 * cleared rather than billed; delayed Stop still snaps to last RADIUS
 * update / start + Acct-Session-Time when NAS is plausible. Remaining time
 * is recomputed and Consumed is restored to Activated when time is left.
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
  const leftoverSec = LEFTOVER_HOST_SESSION_SEC;
  const delayedNasCap = IMPLAUSIBLE_ACCT_SESSION_SEC;
  let radiusFixed = 0;
  if (names.length > 0) {
    const hot = await tx.$executeRaw`
      UPDATE wf_radius_session rs
      SET
        started_at = v.start_at,
        last_interim_at = v.last_at,
        stopped_at = CASE
          WHEN v.leftover
            OR rs.status = 'STOP'::"RadiusAcctStatus"
            OR rs.stopped_at IS NOT NULL
          THEN v.last_at
          ELSE rs.stopped_at
        END,
        status = CASE
          WHEN v.leftover THEN 'STOP'::"RadiusAcctStatus"
          ELSE rs.status
        END,
        "sessionTimeSec" = v.nas_sec,
        updated_at = CURRENT_TIMESTAMP
      FROM (
        SELECT
          x.id,
          CASE
            WHEN x.leftover_nas OR (x.leftover_wall AND x.nas = 0)
            THEN x.anchor
            ELSE x.base_start
          END AS start_at,
          CASE
            WHEN x.leftover_nas OR (x.leftover_wall AND x.nas = 0)
            THEN x.anchor
            WHEN x.nas > 0
              AND x.nas <= ${leftoverSec}
              AND (x.leftover_wall OR (x.nas <= ${delayedNasCap} AND x.wall_sec > x.nas * 2))
            THEN x.base_start + (x.nas * INTERVAL '1 second')
            ELSE COALESCE(x.last_interim_at, x.created_at, x.started_at)
          END AS last_at,
          CASE WHEN x.leftover_nas THEN 0 ELSE x.session_time_sec END AS nas_sec,
          (x.leftover_nas OR (x.leftover_wall AND x.nas = 0)) AS leftover
        FROM (
          SELECT
            s.id,
            s.started_at,
            s.created_at,
            s.last_interim_at,
            s."sessionTimeSec" AS session_time_sec,
            COALESCE(s."sessionTimeSec", 0) AS nas,
            GREATEST(
              s.started_at,
              s.created_at,
              COALESCE(c.activated_at, c.sold_at, c.created_at, s.started_at)
            ) AS base_start,
            EXTRACT(EPOCH FROM (
              COALESCE(s.last_interim_at, s.stopped_at, CURRENT_TIMESTAMP)
              - GREATEST(
                  s.started_at,
                  s.created_at,
                  COALESCE(c.activated_at, c.sold_at, c.created_at, s.started_at)
                )
            )) AS wall_sec,
            GREATEST(
              GREATEST(
                s.started_at,
                s.created_at,
                COALESCE(c.activated_at, c.sold_at, c.created_at, s.started_at)
              ),
              COALESCE(s.last_interim_at, s.stopped_at, s.created_at, s.started_at)
            ) AS anchor,
            COALESCE(s."sessionTimeSec", 0) > ${leftoverSec} AS leftover_nas,
            EXTRACT(EPOCH FROM (
              COALESCE(s.last_interim_at, s.stopped_at, CURRENT_TIMESTAMP)
              - GREATEST(
                  s.started_at,
                  s.created_at,
                  COALESCE(c.activated_at, c.sold_at, c.created_at, s.started_at)
                )
            )) > ${leftoverSec} AS leftover_wall
          FROM wf_radius_session s
          INNER JOIN wf_credential c ON c.id = ${existing.id}
          WHERE s.user_name IN (${Prisma.join(names)})
        ) x
      ) v
      WHERE rs.id = v.id
    `;
    const archive = await tx.$executeRaw`
      UPDATE wf_radius_session_archive rs
      SET
        started_at = v.start_at,
        last_interim_at = v.last_at,
        stopped_at = v.last_at,
        status = CASE
          WHEN v.leftover THEN 'STOP'::"RadiusAcctStatus"
          ELSE rs.status
        END,
        session_time_sec = v.nas_sec
      FROM (
        SELECT
          x.id,
          CASE
            WHEN x.leftover_nas OR (x.leftover_wall AND x.nas = 0)
            THEN x.anchor
            ELSE x.base_start
          END AS start_at,
          CASE
            WHEN x.leftover_nas OR (x.leftover_wall AND x.nas = 0)
            THEN x.anchor
            WHEN x.nas > 0
              AND x.nas <= ${leftoverSec}
              AND (x.leftover_wall OR (x.nas <= ${delayedNasCap} AND x.wall_sec > x.nas * 2))
            THEN x.base_start + (x.nas * INTERVAL '1 second')
            ELSE COALESCE(x.last_interim_at, x.stopped_at, x.started_at)
          END AS last_at,
          CASE WHEN x.leftover_nas THEN 0 ELSE x.session_time_sec END AS nas_sec,
          (x.leftover_nas OR (x.leftover_wall AND x.nas = 0)) AS leftover
        FROM (
          SELECT
            s.id,
            s.started_at,
            s.last_interim_at,
            s.stopped_at,
            s.session_time_sec,
            COALESCE(s.session_time_sec, 0) AS nas,
            GREATEST(
              s.started_at,
              COALESCE(c.activated_at, c.sold_at, c.created_at, s.started_at)
            ) AS base_start,
            EXTRACT(EPOCH FROM (
              COALESCE(s.last_interim_at, s.stopped_at, CURRENT_TIMESTAMP)
              - GREATEST(
                  s.started_at,
                  COALESCE(c.activated_at, c.sold_at, c.created_at, s.started_at)
                )
            )) AS wall_sec,
            GREATEST(
              GREATEST(
                s.started_at,
                COALESCE(c.activated_at, c.sold_at, c.created_at, s.started_at)
              ),
              COALESCE(s.last_interim_at, s.stopped_at, s.started_at)
            ) AS anchor,
            COALESCE(s.session_time_sec, 0) > ${leftoverSec} AS leftover_nas,
            EXTRACT(EPOCH FROM (
              COALESCE(s.last_interim_at, s.stopped_at, CURRENT_TIMESTAMP)
              - GREATEST(
                  s.started_at,
                  COALESCE(c.activated_at, c.sold_at, c.created_at, s.started_at)
                )
            )) > ${leftoverSec} AS leftover_wall
          FROM wf_radius_session_archive s
          INNER JOIN wf_credential c ON c.id = ${existing.id}
          WHERE s.user_name IN (${Prisma.join(names)})
        ) x
      ) v
      WHERE rs.id = v.id
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
