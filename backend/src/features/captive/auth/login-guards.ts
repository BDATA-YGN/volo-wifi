import PrismaDBConnection from '@/prisma/prisma-client';
import {
  CredentialStatus,
  Plan,
  PlanTimeUsageMode,
  RadiusAcctStatus,
  StationTokenUsageScope,
} from '@/generated/prisma/client';
import {
  aggregateRadiusUsedBytes,
  aggregateRadiusUsedSeconds,
  isPlanActivationWindowExceeded,
  planDataQuotaBytes,
  planHasDataQuota,
  planHasTimeQuota,
  planTimeQuotaSec,
  radiusUsageSinceForPlan,
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
  plan: Pick<Plan, 'quotaType' | 'timeAmount' | 'timeUnit' | 'timeUsageMode' | 'maxDevices'>,
): Promise<{ usedSec: number; quotaSec: number } | null> {
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
  if (credential.activatedAt) {
    const elapsedSec = Math.max(
      0,
      Math.floor((Date.now() - credential.activatedAt.getTime()) / 1000),
    );
    usedSec = Math.min(usedSec, Math.max(1, plan.maxDevices ?? 1) * elapsedSec);
  }

  return { usedSec, quotaSec };
}

export async function assertRadiusDataQuotaAllowsLogin(
  credential: {
    id: string;
    username: string | null;
    token: string | null;
    singleSessionResellerUnlockAt: Date | null;
    activatedAt: Date | null;
    soldAt: Date | null;
  },
  plan: Pick<Plan, 'quotaType' | 'dataMb' | 'timeUsageMode'>,
): Promise<{ usedBytes: bigint; quotaBytes: bigint } | null> {
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

  return { usedBytes, quotaBytes };
}

/** Common Calling-Station-Id spellings for the same 12-hex MAC. */
function callingStationIdCandidates(macNorm: string): string[] {
  const hex = macNorm.toLowerCase();
  const upper = hex.toUpperCase();
  const colon = hex.match(/.{1,2}/g)?.join(':') ?? hex;
  const dash = hex.match(/.{1,2}/g)?.join('-') ?? hex;
  return [...new Set([hex, upper, colon, colon.toUpperCase(), dash, dash.toUpperCase()])];
}

/**
 * Soft-end open RADIUS rows on this client MAC for any token.
 * Same-device portal re-login / token switch / missing Acct-Stop — so a new
 * token is not charged leftover Session-Timeout from the previous token.
 */
async function endOpenRadiusSessionsForSameDevice(params: {
  clientMacNorm: string;
}): Promise<number> {
  const { clientMacNorm } = params;

  const openRows = await prisma.radiusSession.findMany({
    where: {
      status: { in: [RadiusAcctStatus.START, RadiusAcctStatus.INTERIM] },
      stoppedAt: null,
      callingStationId: { in: callingStationIdCandidates(clientMacNorm), mode: 'insensitive' },
    },
    select: {
      id: true,
      callingStationId: true,
      startedAt: true,
      createdAt: true,
      lastInterimAt: true,
    },
  });

  const matched = openRows.filter(
    (row) => normalizeCaptiveMac(row.callingStationId) === clientMacNorm,
  );
  if (matched.length === 0) return 0;

  const now = new Date();
  await Promise.all(
    matched.map((row) => {
      const stoppedAt = row.lastInterimAt ?? row.createdAt ?? row.startedAt;
      return prisma.radiusSession.update({
        where: { id: row.id },
        data: {
          stoppedAt,
          status: RadiusAcctStatus.STOP,
          terminateCause: 'Portal-ReLogin',
          updatedAt: now,
        },
      });
    }),
  );

  return matched.length;
}

async function collectOccupiedDeviceKeys(params: {
  userNameVariants: string[];
  credentialCreatedAt?: Date | null;
  nowMs?: number;
}): Promise<Set<string>> {
  const { userNameVariants, credentialCreatedAt, nowMs = Date.now() } = params;
  const occupied = new Set<string>();

  if (userNameVariants.length === 0) {
    return occupied;
  }

  const radiusRows = await prisma.radiusSession.findMany({
    where: {
      userName: { in: userNameVariants },
      status: { in: [RadiusAcctStatus.START, RadiusAcctStatus.INTERIM] },
      stoppedAt: null,
      ...(credentialCreatedAt ? { createdAt: { gte: credentialCreatedAt } } : {}),
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

  const since = new Date(nowMs - PORTAL_LOGIN_SLOT_MS);
  const portalRows = await prisma.captivePortalSession.findMany({
    where: {
      username: { in: userNameVariants },
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
 * - Same MAC with any open RADIUS session (any token) → soft-end those rows, then allow.
 *   Prevents leftover Session-Timeout from a previous token on this phone.
 * - Occupied slots = open RADIUS MACs ∪ CaptivePortalSession MACs (last 3 min).
 * - Same MAC already occupied → allow (reconnect).
 * - Other devices at maxDevices → DEVICE_LIMIT_REACHED.
 * - No client MAC but someone else online → RADIUS_SESSION_ACTIVE.
 * - Capacity-tier tokenUsageScope SITE/TIER → request site must match (nasParams OR).
 * - Time remaining is always per token/username (RADIUS User-Name), never per device.
 * - Data remaining is also per token/username (TIME_AND_DATA / DATA_ONLY).
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

  if (clientMacNorm) {
    await endOpenRadiusSessionsForSameDevice({
      clientMacNorm,
    });
  }

  const occupied = await collectOccupiedDeviceKeys({
    userNameVariants,
    credentialCreatedAt: credential.createdAt,
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

  const dataQuota = await assertRadiusDataQuotaAllowsLogin(credential, plan);
  if (dataQuota && dataQuota.usedBytes >= dataQuota.quotaBytes) {
    await prisma.credential.update({
      where: { id: credential.id },
      data: { status: CredentialStatus.CONSUMED, dataRemainingMb: 0 },
    });
    throw Object.assign(new Error('NO_DATA_REMAINING'), { code: 'NO_DATA_REMAINING' });
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
