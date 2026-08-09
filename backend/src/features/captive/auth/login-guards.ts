import PrismaDBConnection from '@/prisma/prisma-client';
import {
  CredentialStatus,
  Plan,
  PlanTimeUsageMode,
  RadiusAcctStatus,
  StationTokenUsageScope,
} from '@/generated/prisma/client';
import {
  aggregateRadiusUsedSeconds,
  isPlanActivationWindowExceeded,
  planHasTimeQuota,
  planTimeQuotaSec,
  radiusUserNameVariants,
} from '@/features/shared/credentials/credential-sync.helpers';
import { normalizeCaptiveMac } from '@/features/captive/utils/captive-client-ip';
import { resolveRequestStationFromNasParams } from './resolve-request-station';

const prisma = PrismaDBConnection.getConnection();

/** INTERIM with no fresh accounting treated as ended for device-slot checks. */
const RADIUS_INTERIM_STALE_MS = 5 * 60 * 1000;
/** Recent portal logins reserve a device slot before Accounting-Start arrives. */
const PORTAL_LOGIN_SLOT_MS = 3 * 60 * 1000;

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
  station: {
    select: {
      id: true,
      orgId: true,
      stationSizeId: true,
      nasIdentifier: true,
      radiusClientIp: true,
      nasMac: true,
      stationSize: {
        select: {
          id: true,
          tokenUsageScope: true,
        },
      },
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
  const mac = normalizeCaptiveMac(row.callingStationId);
  return mac ?? `acct:${row.acctSessionId}`;
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

/**
 * Soft-end open RADIUS rows for this credential that match the client MAC
 * (same-device portal re-login / missing Acct-Stop).
 */
async function endOpenRadiusSessionsForSameDevice(params: {
  userNameVariants: string[];
  clientMacNorm: string;
}): Promise<number> {
  const { userNameVariants, clientMacNorm } = params;
  if (userNameVariants.length === 0) return 0;

  const openRows = await prisma.radiusSession.findMany({
    where: {
      userName: { in: userNameVariants },
      status: { in: [RadiusAcctStatus.START, RadiusAcctStatus.INTERIM] },
      stoppedAt: null,
    },
    select: {
      id: true,
      callingStationId: true,
    },
  });

  const ids = openRows
    .filter((row) => normalizeCaptiveMac(row.callingStationId) === clientMacNorm)
    .map((row) => row.id);

  if (ids.length === 0) return 0;

  const now = new Date();
  await prisma.radiusSession.updateMany({
    where: { id: { in: ids } },
    data: {
      stoppedAt: now,
      status: RadiusAcctStatus.STOP,
      terminateCause: 'Portal-ReLogin',
      updatedAt: now,
    },
  });

  return ids.length;
}

async function collectOccupiedDeviceKeys(params: {
  credentialId: string;
  userNameVariants: string[];
  nowMs?: number;
}): Promise<Set<string>> {
  const { credentialId, userNameVariants, nowMs = Date.now() } = params;
  const occupied = new Set<string>();

  if (userNameVariants.length > 0) {
    const radiusRows = await prisma.radiusSession.findMany({
      where: {
        userName: { in: userNameVariants },
        status: { in: [RadiusAcctStatus.START, RadiusAcctStatus.INTERIM] },
        stoppedAt: null,
      },
      select: {
        acctSessionId: true,
        callingStationId: true,
        status: true,
        stoppedAt: true,
        lastInterimAt: true,
      },
    });

    for (const row of radiusRows) {
      if (!isRadiusSessionEnded(row, nowMs)) {
        occupied.add(radiusSessionDeviceKey(row));
      }
    }
  }

  const since = new Date(nowMs - PORTAL_LOGIN_SLOT_MS);
  const portalRows = await prisma.captivePortalSession.findMany({
    where: {
      credentialId,
      createdAt: { gte: since },
    },
    select: { mac: true },
    orderBy: { createdAt: 'desc' },
  });

  for (const row of portalRows) {
    const mac = normalizeCaptiveMac(row.mac);
    if (mac) occupied.add(mac);
  }

  return occupied;
}

export type CaptiveLoginCredential = Awaited<
  ReturnType<typeof prisma.credential.findFirst<{ include: typeof captiveLoginCredentialInclude }>>
>;

export type CaptiveLoginGuardOptions = {
  /** Client MAC from NAS redirect / x-calling-station-id (optional). */
  clientMac?: string | null;
  /** Gateway redirect query params from the captive portal (site-lock). */
  nasParams?: Record<string, unknown> | null;
};

/**
 * Device / session gates for captive login.
 *
 * - Same MAC with an open RADIUS session → soft-end those rows, then allow.
 * - Occupied slots = open RADIUS MACs ∪ CaptivePortalSession MACs (last 3 min).
 * - Same MAC already occupied → allow (reconnect).
 * - Other devices at maxDevices → DEVICE_LIMIT_REACHED.
 * - No client MAC but someone else online → RADIUS_SESSION_ACTIVE.
 * - Capacity-tier tokenUsageScope SITE/TIER → request site must match (nasParams OR).
 */
export async function runCaptiveLoginGuards(
  credential: NonNullable<CaptiveLoginCredential>,
  options: CaptiveLoginGuardOptions = {},
): Promise<void> {
  const plan = credential.plan;
  if (!plan) {
    throw Object.assign(new Error('INVALID_CREDENTIAL'), { code: 'INVALID_CREDENTIAL' });
  }

  await assertCaptiveTokenSiteScope(credential, options.nasParams);

  const userNameVariants = radiusUserNameVariants(credential);
  const clientMacNorm = normalizeCaptiveMac(options.clientMac);

  if (clientMacNorm && userNameVariants.length > 0) {
    await endOpenRadiusSessionsForSameDevice({
      userNameVariants,
      clientMacNorm,
    });
  }

  const occupied = await collectOccupiedDeviceKeys({
    credentialId: credential.id,
    userNameVariants,
  });

  const maxDevices =
    plan.timeUsageMode === PlanTimeUsageMode.SINGLE_SESSION
      ? 1
      : Math.max(1, plan.maxDevices ?? 1);

  if (clientMacNorm && occupied.has(clientMacNorm)) {
    // Same device reconnect / portal retry — already cleared matching RADIUS rows above.
  } else if (occupied.size >= maxDevices) {
    throw Object.assign(new Error('DEVICE_LIMIT_REACHED'), {
      code: 'DEVICE_LIMIT_REACHED',
      maxDevices,
    });
  } else if (!clientMacNorm && occupied.size > 0) {
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

  if (plan.timeUsageMode === PlanTimeUsageMode.SINGLE_SESSION) {
    if (isPlanActivationWindowExceeded(credential, plan)) {
      await prisma.credential.update({
        where: { id: credential.id },
        data: { status: CredentialStatus.CONSUMED },
      });
      throw Object.assign(new Error('CREDENTIAL_CONSUMED'), { code: 'CREDENTIAL_CONSUMED' });
    }
  }
}

/**
 * Enforce capacity-tier tokenUsageScope at captive login (clear portal message).
 * Issuing site = Credential.stationId. ALL / missing station → no lock.
 */
async function assertCaptiveTokenSiteScope(
  credential: NonNullable<CaptiveLoginCredential>,
  nasParams: Record<string, unknown> | null | undefined,
): Promise<void> {
  if (!credential.stationId || !credential.station) {
    return;
  }

  const scope =
    credential.station.stationSize?.tokenUsageScope ?? StationTokenUsageScope.ALL;
  if (scope === StationTokenUsageScope.ALL) {
    return;
  }

  const resolved = await resolveRequestStationFromNasParams({
    orgId: credential.orgId,
    nasParams,
    preferStationId: credential.stationId,
  });

  if (resolved.status === 'unknown') {
    throw Object.assign(new Error('TOKEN_LOCATION_UNKNOWN'), {
      code: 'TOKEN_LOCATION_UNKNOWN',
    });
  }
  if (resolved.status === 'ambiguous') {
    throw Object.assign(new Error('TOKEN_LOCATION_AMBIGUOUS'), {
      code: 'TOKEN_LOCATION_AMBIGUOUS',
    });
  }

  const requestStation = resolved.station;

  if (scope === StationTokenUsageScope.SITE) {
    if (requestStation.id !== credential.stationId) {
      throw Object.assign(new Error('TOKEN_SITE_MISMATCH'), { code: 'TOKEN_SITE_MISMATCH' });
    }
    return;
  }

  if (scope === StationTokenUsageScope.TIER) {
    const issuingSizeId = credential.station.stationSizeId;
    if (!issuingSizeId || requestStation.stationSizeId !== issuingSizeId) {
      throw Object.assign(new Error('TOKEN_SITE_MISMATCH'), { code: 'TOKEN_SITE_MISMATCH' });
    }
  }
}
