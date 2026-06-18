import PrismaDBConnection from '@/prisma/prisma-client';
import {
  Plan,
  PlanQuotaType,
  UnitTime,
} from '@/generated/prisma/client';

const prisma = PrismaDBConnection.getConnection();

export function planHasTimeQuota(plan: Pick<Plan, 'quotaType'> | null | undefined): boolean {
  if (!plan) return false;
  return plan.quotaType === PlanQuotaType.TIME_ONLY || plan.quotaType === PlanQuotaType.TIME_AND_DATA;
}

export function planTimeQuotaSec(plan: Pick<Plan, 'timeAmount' | 'timeUnit'> | null | undefined): number | null {
  if (!plan?.timeAmount || !plan.timeUnit) return null;
  const multipliers: Record<UnitTime, number> = {
    MINUTE: 60,
    HOUR: 3600,
    DAY: 86400,
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
 * Sum billed seconds from wf_radius_session (matched by FreeRADIUS User-Name only).
 * @param since If set, only sessions that started on or after this time (single-session cycle).
 */
export async function aggregateRadiusUsedSeconds(
  credential: { id: string; username: string | null; token: string | null },
  options: { since?: Date | null; includeActive?: boolean } = {},
): Promise<number> {
  const { since = null, includeActive = true } = options;
  const userNameVariants = radiusUserNameVariants(credential);
  const sessions = await prisma.radiusSession.findMany({
    where: {
      ...radiusSessionMatchWhere(userNameVariants),
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
    if (s.stoppedAt) {
      const sec =
        s.sessionTimeSec ??
        Math.max(0, Math.floor((s.stoppedAt.getTime() - s.startedAt.getTime()) / 1000));
      total += sec;
    } else if (includeActive) {
      const sec =
        s.sessionTimeSec ?? Math.max(0, Math.floor((now - s.startedAt.getTime()) / 1000));
      total += sec;
    }
  }
  return total;
}
