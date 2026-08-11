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
    },
  });

  const now = Date.now();
  let total = 0;
  for (const s of sessions) {
    if (!s.stoppedAt && !includeActive) continue;
    const endMs = s.stoppedAt ? s.stoppedAt.getTime() : now;
    const wall = Math.max(0, Math.floor((endMs - s.startedAt.getTime()) / 1000));
    // Prefer the larger of NAS Acct-Session-Time and wall clock so under-reported
    // interim/stop values cannot shrink billed usage (reconnect overshoot hole).
    total += Math.max(s.sessionTimeSec ?? 0, wall);
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
