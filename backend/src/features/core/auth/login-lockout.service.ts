import type { Request } from 'express';
import { Container } from 'typedi';
import PrismaDBConnection from '@/prisma/prisma-client';
import { SettingKey, SettingService } from '@/features/core/settings';
import { CustomException } from '@/utils/exception';
import { recordLogin } from '@/features/core/auth/login-log.service';

const prisma = PrismaDBConnection.getConnection();

export type LoginLockPolicy = {
  maxAttempts: number;
  lockDurationMs: number;
  windowMs: number;
};

export type LoginLockErrorDetails = {
  maxAttempts: number;
  failedAttempts?: number;
  remainingAttempts?: number;
  lockedUntil?: string;
  secondsRemaining?: number;
};

export async function loadLoginLockPolicy(): Promise<LoginLockPolicy> {
  const settings = Container.get(SettingService);
  const [maxAttempts, lockMinutes, windowMinutes] = await Promise.all([
    settings.get(SettingKey.DEV_MAX_LOGIN_ATTEMPTS),
    settings.get(SettingKey.DEV_LOGIN_LOCK_DURATION_MINUTES),
    settings.get(SettingKey.DEV_LOGIN_ATTEMPT_WINDOW_MINUTES),
  ]);

  return {
    maxAttempts: Math.max(1, maxAttempts),
    lockDurationMs: Math.max(1, lockMinutes) * 60_000,
    windowMs: Math.max(1, windowMinutes) * 60_000,
  };
}

/** Active lock end time, or null if the account is not locked. */
export async function getActiveLockEnd(
  adminId: string,
  lockDurationMs: number,
): Promise<Date | null> {
  const lastLock = await prisma.loginLog.findFirst({
    where: { userId: adminId, type: 'ACCOUNT_LOCKED', deletedAt: null },
    orderBy: { loginDateTime: 'desc' },
    select: { loginDateTime: true },
  });

  if (!lastLock?.loginDateTime) return null;

  const lockEnds = new Date(lastLock.loginDateTime.getTime() + lockDurationMs);
  return lockEnds > new Date() ? lockEnds : null;
}

function lockErrorDetails(lockEnds: Date, policy: LoginLockPolicy): LoginLockErrorDetails {
  const secondsRemaining = Math.max(0, Math.ceil((lockEnds.getTime() - Date.now()) / 1000));
  return {
    maxAttempts: policy.maxAttempts,
    lockedUntil: lockEnds.toISOString(),
    secondsRemaining,
  };
}

export async function assertLoginNotLocked(adminId: string, policy: LoginLockPolicy): Promise<void> {
  const lockEnds = await getActiveLockEnd(adminId, policy.lockDurationMs);
  if (!lockEnds) return;

  const minutesLeft = Math.max(1, Math.ceil((lockEnds.getTime() - Date.now()) / 60_000));
  throw new CustomException(
    429,
    'ACCOUNT_LOCKED',
    `Too many failed sign-in attempts. Try again in ${minutesLeft} minute(s).`,
    lockErrorDetails(lockEnds, policy),
  );
}

async function countRecentFailedAttempts(adminId: string, windowMs: number): Promise<number> {
  const since = new Date(Date.now() - windowMs);
  return prisma.loginLog.count({
    where: {
      userId: adminId,
      type: 'LOGIN_FAILED',
      deletedAt: null,
      loginDateTime: { gte: since },
    },
  });
}

/**
 * Records a failed attempt; locks the account when failures in the sliding window
 * reach `dev_max_login_attempts`, then throws `ACCOUNT_LOCKED`.
 */
export async function recordFailedLoginAttempt(
  adminId: string,
  username: string,
  req: Request,
  policy: LoginLockPolicy,
): Promise<void> {
  await recordLogin({ userId: adminId, userEmail: username, type: 'LOGIN_FAILED', req });

  const failures = await countRecentFailedAttempts(adminId, policy.windowMs);
  if (failures < policy.maxAttempts) {
    const remainingAttempts = policy.maxAttempts - failures;
    throw new CustomException(401, 'UNAUTHORIZED', 'incorrect credentials', {
      maxAttempts: policy.maxAttempts,
      failedAttempts: failures,
      remainingAttempts,
    } satisfies LoginLockErrorDetails);
  }

  await recordLogin({ userId: adminId, userEmail: username, type: 'ACCOUNT_LOCKED', req });
  await assertLoginNotLocked(adminId, policy);
}
