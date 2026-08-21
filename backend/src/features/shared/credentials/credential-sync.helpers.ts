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
 * NAS Acct-Session-Time can be leftover hotspot host uptime or a copy of
 * Session-Timeout (e.g. 10800s on a 1-minute session). Trust wall clock when
 * NAS time is both >2 minutes beyond wall and more than 2× wall.
 */
export const ACCT_SESSION_TIME_SLACK_SEC = 120;

/**
 * Delayed Accounting-Start can arrive hours later with a backdated `startedAt`
 * while the row is still open. Bill open sessions from insert time, not NAS start.
 */
export function effectiveAccountingStart(
  startedAt: Date,
  options?: { createdAt?: Date | null; stoppedAt?: Date | null },
): Date {
  if (options?.stoppedAt != null || !options?.createdAt) return startedAt;
  return options.createdAt.getTime() > startedAt.getTime() ? options.createdAt : startedAt;
}

export function billedSessionSeconds(
  sessionTimeSec: number | null | undefined,
  startedAt: Date,
  endedAt: Date,
  options?: { createdAt?: Date | null; stoppedAt?: Date | null },
): number {
  const wallStart = effectiveAccountingStart(startedAt, options);
  const wall = Math.max(0, Math.floor((endedAt.getTime() - wallStart.getTime()) / 1000));
  const nas = sessionTimeSec ?? 0;
  if (nas > wall + ACCT_SESSION_TIME_SLACK_SEC && nas > wall * 2) {
    return wall;
  }
  return Math.max(nas, wall);
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
 * Sessions that belong to this credential/token only.
 * Prefer credential_id; fall back to User-Name only when credential_id is unset.
 * Never count another credential's row just because User-Name was rewritten on the same device/session.
 */
export function radiusSessionUsageWhere(credential: {
  id: string;
  username: string | null;
  token: string | null;
}): {
  OR: Array<
    | { credentialId: string }
    | { credentialId: null; userName: { in: string[] } }
  >;
} {
  return {
    OR: [
      { credentialId: credential.id },
      {
        credentialId: null,
        ...radiusSessionMatchWhere(radiusUserNameVariants(credential)),
      },
    ],
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
  plan: Pick<Plan, 'quotaType' | 'timeAmount' | 'timeUnit' | 'timeUsageMode'>,
): Promise<number | null> {
  if (!planHasTimeQuota(plan)) {
    return null;
  }
  const quotaSec = planTimeQuotaSec(plan);
  if (quotaSec == null || quotaSec <= 0) {
    return null;
  }
  const usedSec = await aggregateRadiusUsedSeconds(credential, {
    since: radiusUsageSinceForPlan(credential, plan),
    includeActive: true,
  });
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
