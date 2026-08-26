import PrismaDBConnection from '@/prisma/prisma-client';
import {
  Plan,
  PlanTimeUsageMode,
  UnitTime,
} from '@/generated/prisma/client';

const prisma = PrismaDBConnection.getConnection();

export type CredentialTimeUsageIdentity = {
  id: string;
  username: string | null;
  token: string | null;
  singleSessionResellerUnlockAt?: Date | null;
  activatedAt?: Date | null;
  soldAt?: Date | null;
};

export function planHasTimeQuota(
  plan: Pick<Plan, 'quotaType' | 'timeAmount'> | null | undefined,
): boolean {
  if (!plan) return false;
  if (plan.timeAmount != null) return plan.timeAmount > 0;
  return plan.quotaType === 'TIME_ONLY' || plan.quotaType === 'TIME_AND_DATA';
}

export function planHasDataQuota(
  plan: Pick<Plan, 'quotaType' | 'dataMb'> | null | undefined,
): boolean {
  if (!plan) return false;
  if (plan.dataMb != null) return plan.dataMb > 0;
  return plan.quotaType === 'DATA_ONLY' || plan.quotaType === 'TIME_AND_DATA';
}

/** Plan data cap in bytes, or null when data is unlimited / unset. */
export function planDataQuotaBytes(
  plan: Pick<Plan, 'dataMb'> | null | undefined,
): bigint | null {
  if (!plan?.dataMb || plan.dataMb <= 0) return null;
  return BigInt(plan.dataMb) * 1024n * 1024n;
}

function toBigIntBytes(value: bigint | number | null | undefined): bigint {
  if (value == null) return 0n;
  if (typeof value === 'bigint') return value < 0n ? 0n : value;
  if (!Number.isFinite(value) || value <= 0) return 0n;
  return BigInt(Math.floor(value));
}

/** Prefer totalBytes; otherwise input + output (same as captive dashboard). */
export function billedSessionBytes(session: {
  totalBytes?: bigint | number | null;
  inputBytes?: bigint | number | null;
  outputBytes?: bigint | number | null;
}): bigint {
  const total = toBigIntBytes(session.totalBytes);
  if (total > 0n) return total;
  return toBigIntBytes(session.inputBytes) + toBigIntBytes(session.outputBytes);
}

export function planTimeQuotaSec(
  plan: Pick<Plan, 'timeAmount' | 'timeUnit'> | null | undefined,
): number | null {
  if (!plan?.timeAmount || plan.timeAmount <= 0 || !plan.timeUnit) return null;
  const multipliers: Record<UnitTime, number> = {
    MINUTE: 60,
    HOUR: 3600,
    DAY: 86400,
    MONTH: 30 * 86400,
  };
  return plan.timeAmount * (multipliers[plan.timeUnit] ?? 0);
}

/**
 * @deprecated Kept for diagnose copy; billed time no longer GREATEST(nas, wall).
 * Session-Timeout copies are discarded only when NAS time exceeds 12h and 2× last-seen.
 */
export const ACCT_SESSION_TIME_SLACK_SEC = 120;

/** NAS Acct-Session-Time above this that also dwarfs last RADIUS update is treated as Session-Timeout copy. */
export const IMPLAUSIBLE_ACCT_SESSION_SEC = 12 * 3600;

/**
 * Login→logout (or NAS time) longer than this is leftover hotspot-host / reused
 * Acct-Session-Id, not a real billed session. Idle-Timeout is 1h; a healthy
 * session does not stay one RADIUS row for more than a day.
 */
export const LEFTOVER_HOST_SESSION_SEC = 24 * 3600;

export type BilledSessionTimeOptions = {
  createdAt?: Date | null;
  stoppedAt?: Date | null;
  lastInterimAt?: Date | null;
};

/**
 * MikroTik often copies Session-Timeout into Acct-Session-Time. Late Interim/Stop
 * INSERT then sets started_at = now − that value (e.g. 30 days ago on a 30-day
 * plan). Always measure from insert time when created_at is later than started_at.
 */
export function effectiveAccountingStart(
  startedAt: Date,
  options?: { createdAt?: Date | null; stoppedAt?: Date | null },
): Date {
  if (!options?.createdAt) return startedAt;
  return options.createdAt.getTime() > startedAt.getTime() ? options.createdAt : startedAt;
}

export function lastSeenSessionSeconds(
  startedAt: Date,
  endedAt: Date,
  options?: BilledSessionTimeOptions,
): number {
  const wallStart = effectiveAccountingStart(startedAt, options);
  const lastSeenAt = options?.lastInterimAt ?? options?.stoppedAt ?? endedAt;
  return Math.max(0, Math.floor((lastSeenAt.getTime() - wallStart.getTime()) / 1000));
}

export function isLeftoverHostSession(
  sessionTimeSec: number | null | undefined,
  lastSeenSec: number,
): boolean {
  const nas = sessionTimeSec ?? 0;
  return lastSeenSec > LEFTOVER_HOST_SESSION_SEC || nas > LEFTOVER_HOST_SESSION_SEC;
}

/**
 * Bill last RADIUS update minus effective start. Do not trust Acct-Session-Time
 * when it is leftover hotspot-host uptime (days) or a Session-Timeout copy.
 * NAS time is only used when last-seen wall is 0 (timestamps were snapped).
 */
export function billedSessionSeconds(
  sessionTimeSec: number | null | undefined,
  startedAt: Date,
  endedAt: Date,
  options?: BilledSessionTimeOptions,
): number {
  const lastSeen = lastSeenSessionSeconds(startedAt, endedAt, options);
  const nas = sessionTimeSec ?? 0;

  if (lastSeen > LEFTOVER_HOST_SESSION_SEC && nas > LEFTOVER_HOST_SESSION_SEC) {
    return 0;
  }
  if (nas > LEFTOVER_HOST_SESSION_SEC) {
    return lastSeen;
  }
  if (lastSeen > LEFTOVER_HOST_SESSION_SEC) {
    return nas > 0 && nas <= LEFTOVER_HOST_SESSION_SEC ? nas : 0;
  }
  if (lastSeen === 0 && nas > 0 && nas <= LEFTOVER_HOST_SESSION_SEC) {
    return nas;
  }
  if (nas > IMPLAUSIBLE_ACCT_SESSION_SEC && nas > lastSeen * 2) {
    return lastSeen;
  }
  if (nas > 0) {
    return Math.min(nas, lastSeen);
  }
  return lastSeen;
}

/** True when wall-clock time since activation meets or exceeds the plan time allowance. */
export function isPlanActivationWindowExceeded(
  credential: { activatedAt: Date | null },
  plan: Pick<Plan, 'quotaType' | 'timeAmount' | 'timeUnit'> | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!credential.activatedAt || !plan || !planHasTimeQuota(plan)) {
    return false;
  }

  const quotaSec = planTimeQuotaSec(plan);
  if (quotaSec == null || quotaSec <= 0) {
    return false;
  }

  const elapsedSec = Math.max(
    0,
    Math.floor((now.getTime() - credential.activatedAt.getTime()) / 1000),
  );
  return elapsedSec >= quotaSec;
}

/** FreeRADIUS User-Name = token (often uppercase) or username; wf_radius_session has no credentialId. */
export function radiusUserNameVariants(credential: {
  username: string | null;
  token: string | null;
}): string[] {
  const out = new Set<string>();
  if (credential.username?.trim()) {
    out.add(credential.username.trim());
  }
  if (credential.token?.trim()) {
    const t = credential.token.trim();
    out.add(t);
    out.add(t.toUpperCase());
  }
  return [...out];
}

export function radiusSessionMatchWhere(
  userNameVariants: string[],
): { userName: { in: string[] } } {
  if (userNameVariants.length === 0) {
    return { userName: { in: ['\0__NO_RADIUS_USER_NAME__'] } };
  }
  return { userName: { in: userNameVariants } };
}

/**
 * Sessions billed to this token/username (RADIUS User-Name).
 * Do not match on credential_id — leftover rows can keep an old FK after
 * User-Name changes, which makes deleted sessions reappear on the token.
 */
export function radiusSessionUsageWhere(credential: {
  username: string | null;
  token: string | null;
}): { userName: { in: string[] } } {
  return radiusSessionMatchWhere(radiusUserNameVariants(credential));
}

/** Captive portal rows for this token/username (`wf_captive_portal_session.username`). */
export function captivePortalSessionUsageWhere(
  orgId: string,
  credential: { username: string | null; token: string | null },
): { orgId: string; username: { in: string[] } } {
  return {
    orgId,
    username: radiusSessionMatchWhere(radiusUserNameVariants(credential)).userName,
  };
}

/**
 * Sum billed seconds from wf_radius_session for this credential/token only
 * (not other tokens that shared the same device / Calling-Station-Id).
 * @param since If set, only sessions that started on or after this time (single-session cycle).
 */
export async function aggregateRadiusUsedSeconds(
  credential: { id: string; username: string | null; token: string | null },
  options: { since?: Date | null; includeActive?: boolean } = {},
): Promise<number> {
  const { since = null, includeActive = true } = options;
  const sessions = await prisma.radiusSession.findMany({
    where: {
      ...radiusSessionUsageWhere(credential),
      ...(since ? { startedAt: { gte: since } } : {}),
    },
    select: {
      sessionTimeSec: true,
      startedAt: true,
      stoppedAt: true,
      createdAt: true,
      lastInterimAt: true,
    },
  });

  const now = Date.now();
  let total = 0;
  for (const s of sessions) {
    if (!s.stoppedAt && !includeActive) continue;
    const end = s.stoppedAt ?? new Date(now);
    total += billedSessionSeconds(s.sessionTimeSec, s.startedAt, end, {
      createdAt: s.createdAt,
      stoppedAt: s.stoppedAt,
      lastInterimAt: s.lastInterimAt,
    });
  }
  return total;
}

export async function aggregateRadiusUsedBytes(
  credential: { id: string; username: string | null; token: string | null },
  options: { since?: Date | null; includeActive?: boolean } = {},
): Promise<bigint> {
  const { since = null, includeActive = true } = options;
  const sessions = await prisma.radiusSession.findMany({
    where: {
      ...radiusSessionUsageWhere(credential),
      ...(since ? { startedAt: { gte: since } } : {}),
    },
    select: {
      totalBytes: true,
      inputBytes: true,
      outputBytes: true,
      stoppedAt: true,
    },
  });

  let total = 0n;
  for (const session of sessions) {
    if (!session.stoppedAt && !includeActive) continue;
    total += billedSessionBytes(session);
  }
  return total;
}

export function radiusUsageSinceForPlan(
  credential: Pick<
    CredentialTimeUsageIdentity,
    'singleSessionResellerUnlockAt' | 'activatedAt' | 'soldAt'
  >,
  plan: Pick<Plan, 'timeUsageMode'>,
): Date | null {
  if (plan.timeUsageMode !== PlanTimeUsageMode.SINGLE_SESSION) {
    return null;
  }
  return (
    credential.singleSessionResellerUnlockAt ??
    credential.activatedAt ??
    credential.soldAt ??
    null
  );
}

/** Remaining plan seconds (quota − RADIUS used), or null when the plan has no time quota. */
export async function computeCredentialTimeRemainingSec(
  credential: CredentialTimeUsageIdentity,
  plan: Pick<Plan, 'quotaType' | 'timeAmount' | 'timeUnit' | 'timeUsageMode' | 'maxDevices'>,
): Promise<number | null> {
  if (!planHasTimeQuota(plan)) {
    return null;
  }
  const quotaSec = planTimeQuotaSec(plan);
  if (quotaSec == null || quotaSec <= 0) {
    return null;
  }
  let usedSec = await aggregateRadiusUsedSeconds(credential, {
    since: radiusUsageSinceForPlan(credential, plan),
    includeActive: true,
  });
  const floor = credential.activatedAt ?? credential.soldAt ?? null;
  if (floor) {
    const elapsedSec = Math.max(0, Math.floor((Date.now() - floor.getTime()) / 1000));
    const deviceCap = Math.max(1, plan.maxDevices ?? 1) * elapsedSec;
    usedSec = Math.min(usedSec, deviceCap);
  }
  return Math.max(0, quotaSec - usedSec);
}

/** Remaining plan data in MB (quota − RADIUS used), or null when the plan has no data quota. */
export async function computeCredentialDataRemainingMb(
  credential: CredentialTimeUsageIdentity,
  plan: Pick<Plan, 'quotaType' | 'dataMb' | 'timeUsageMode'>,
): Promise<number | null> {
  if (!planHasDataQuota(plan)) {
    return null;
  }
  const quotaBytes = planDataQuotaBytes(plan);
  if (quotaBytes == null || quotaBytes <= 0n) {
    return null;
  }
  const usedBytes = await aggregateRadiusUsedBytes(credential, {
    since: radiusUsageSinceForPlan(credential, plan),
    includeActive: true,
  });
  const remainingBytes = quotaBytes > usedBytes ? quotaBytes - usedBytes : 0n;
  return Number(remainingBytes / (1024n * 1024n));
}

/** Wall-clock voucher expiry from first activation (validityDays). */
export function resolveActivationExpiresAt(
  activatedAt: Date,
  validityDays: number | null | undefined,
  existingExpiresAt?: Date | null,
): Date | null {
  if (existingExpiresAt) return existingExpiresAt;
  if (validityDays == null || validityDays <= 0) return null;
  return new Date(activatedAt.getTime() + validityDays * 86_400_000);
}
