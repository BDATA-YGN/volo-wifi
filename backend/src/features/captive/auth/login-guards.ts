import PrismaDBConnection from '@/prisma/prisma-client';
import {
  CredentialStatus,
  Plan,
  PlanTimeUsageMode,
  RadiusAcctStatus,
} from '@/generated/prisma/client';
import {
  aggregateRadiusUsedSeconds,
  isPlanActivationWindowExceeded,
  planHasTimeQuota,
  planTimeQuotaSec,
  radiusUserNameVariants,
} from '@/features/shared/credentials/credential-sync.helpers';

const prisma = PrismaDBConnection.getConnection();

const RADIUS_INTERIM_STALE_MS = 15 * 60 * 1000;

export const captiveLoginCredentialInclude = {
  plan: {
    select: {
      id: true,
      orgId: true,
      quotaType: true,
      timeAmount: true,
      timeUnit: true,
      dataMb: true,
      maxDevices: true,
      timeUsageMode: true,
      isActive: true,
      validityDays: true,
    },
  },
} as const;

function isLastInterimStale(lastInterimAt: Date | null, nowMs = Date.now()): boolean {
  return lastInterimAt != null && nowMs - lastInterimAt.getTime() > RADIUS_INTERIM_STALE_MS;
}

function radiusSessionDeviceKey(row: {
  callingStationId: string | null;
  acctSessionId: string;
}): string {
  const mac = row.callingStationId?.trim();
  return mac ? mac.toLowerCase() : `acct:${row.acctSessionId}`;
}

function isRadiusSessionEnded(
  session: {
    status: RadiusAcctStatus;
    stoppedAt: Date | null;
    lastInterimAt?: Date | null;
  },
  nowMs = Date.now(),
): boolean {
  if (session.status === RadiusAcctStatus.STOP || session.stoppedAt != null) {
    return true;
  }
  if (session.status === RadiusAcctStatus.START) {
    return false;
  }
  return isLastInterimStale(session.lastInterimAt ?? null, nowMs);
}

export async function assertRadiusTimeQuotaAllowsLogin(
  credential: {
    id: string;
    username: string | null;
    token: string | null;
    singleSessionResellerUnlockAt: Date | null;
    activatedAt: Date | null;
    soldAt: Date | null;
  },
  plan: Pick<Plan, 'quotaType' | 'timeAmount' | 'timeUnit' | 'timeUsageMode'>,
): Promise<{ usedSec: number; quotaSec: number } | null> {
  if (!planHasTimeQuota(plan)) {
    return null;
  }

  const quotaSec = planTimeQuotaSec(plan);
  if (quotaSec == null || quotaSec <= 0) {
    return null;
  }

  const usageSince =
    plan.timeUsageMode === PlanTimeUsageMode.SINGLE_SESSION
      ? credential.singleSessionResellerUnlockAt ??
        credential.activatedAt ??
        credential.soldAt ??
        null
      : null;

  const usedSec = await aggregateRadiusUsedSeconds(credential, {
    since: usageSince,
    includeActive: true,
  });

  return { usedSec, quotaSec };
}

async function hasActiveRadiusAccountingWithoutStop(params: {
  userNameVariants: string[];
  strictNoStopMeansOpen?: boolean;
}): Promise<boolean> {
  const { userNameVariants, strictNoStopMeansOpen = false } = params;
  if (userNameVariants.length === 0) {
    return false;
  }

  const rows = await prisma.radiusSession.findMany({
    where: {
      userName: { in: userNameVariants },
      status: { in: [RadiusAcctStatus.START, RadiusAcctStatus.INTERIM] },
      stoppedAt: null,
    },
    select: {
      status: true,
      stoppedAt: true,
      lastInterimAt: true,
    },
  });

  if (rows.length === 0) return false;
  if (strictNoStopMeansOpen) return true;

  const now = Date.now();
  for (const row of rows) {
    if (!isRadiusSessionEnded(row, now)) {
      return true;
    }
  }

  return false;
}

async function countActiveDevicesForMaxDevicesCheck(userNameVariants: string[]): Promise<number> {
  if (userNameVariants.length === 0) {
    return 0;
  }

  const rows = await prisma.radiusSession.findMany({
    where: { userName: { in: userNameVariants } },
    select: {
      acctSessionId: true,
      callingStationId: true,
      status: true,
      stoppedAt: true,
      startedAt: true,
      lastInterimAt: true,
    },
    orderBy: { startedAt: 'desc' },
  });

  const latestByDevice = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = radiusSessionDeviceKey(row);
    if (!latestByDevice.has(key)) {
      latestByDevice.set(key, row);
    }
  }

  const now = Date.now();
  let active = 0;
  for (const session of latestByDevice.values()) {
    if (!isRadiusSessionEnded(session, now)) {
      active++;
    }
  }
  return active;
}

export type CaptiveLoginCredential = Awaited<
  ReturnType<typeof prisma.credential.findFirst<{ include: typeof captiveLoginCredentialInclude }>>
>;

export async function runCaptiveLoginGuards(credential: NonNullable<CaptiveLoginCredential>): Promise<void> {
  const plan = credential.plan;
  if (!plan) {
    throw Object.assign(new Error('INVALID_CREDENTIAL'), { code: 'INVALID_CREDENTIAL' });
  }

  const userNameVariants = radiusUserNameVariants(credential);

  const radiusAccountingBusy =
    userNameVariants.length > 0
      ? await hasActiveRadiusAccountingWithoutStop({
          userNameVariants,
          strictNoStopMeansOpen: true,
        })
      : false;

  if (radiusAccountingBusy) {
    throw Object.assign(new Error('RADIUS_SESSION_ACTIVE'), { code: 'RADIUS_SESSION_ACTIVE' });
  }

  const timeQuota = await assertRadiusTimeQuotaAllowsLogin(credential, plan);
  if (timeQuota && timeQuota.usedSec >= timeQuota.quotaSec) {
    await prisma.credential.update({
      where: { id: credential.id },
      data: { status: CredentialStatus.CONSUMED },
    });
    throw Object.assign(new Error('CREDENTIAL_CONSUMED'), { code: 'CREDENTIAL_CONSUMED' });
  }

  if (plan.timeUsageMode === PlanTimeUsageMode.CUMULATIVE_SESSIONS) {
    const activeDeviceCount = await countActiveDevicesForMaxDevicesCheck(userNameVariants);
    if (plan.maxDevices != null && activeDeviceCount >= plan.maxDevices) {
      throw Object.assign(new Error('DEVICE_LIMIT_REACHED'), {
        code: 'DEVICE_LIMIT_REACHED',
        maxDevices: plan.maxDevices,
      });
    }
  } else if (plan.timeUsageMode === PlanTimeUsageMode.SINGLE_SESSION) {
    if (isPlanActivationWindowExceeded(credential, plan)) {
      await prisma.credential.update({
        where: { id: credential.id },
        data: { status: CredentialStatus.CONSUMED },
      });
      throw Object.assign(new Error('CREDENTIAL_CONSUMED'), { code: 'CREDENTIAL_CONSUMED' });
    }
  }

}
