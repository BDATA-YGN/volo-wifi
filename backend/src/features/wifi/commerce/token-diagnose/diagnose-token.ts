import type { PrismaClient } from '@/generated/prisma/client';
import {
  billedSessionSeconds,
  planTimeQuotaSec,
  radiusUserNameVariants,
} from '@/features/shared/credentials/credential-sync.helpers';
import { normalizeMacKey } from '@/utils/mac-address';
import {
  AUTH_PREVIEW_LIMIT,
  BYTES_500_MIB,
  CAPTIVE_PREVIEW_LIMIT,
  DATA_CAP_BYTE_SLACK,
  RADIUS_PREVIEW_LIMIT,
  RELATED_MAC_LIMIT,
} from './constants';

export type DiagnoseSeverity = 'ok' | 'info' | 'warning' | 'error';

export type DiagnoseVerdictCode =
  | 'NOT_FOUND'
  | 'UNUSED'
  | 'PORTAL_WITHOUT_RADIUS_AUTH'
  | 'AUTH_WITHOUT_ACCOUNTING'
  | 'FIRST_SESSION_MISSING'
  | 'DATA_CAP_DISCONNECT'
  | 'INFLATED_SESSION_TIME'
  | 'REJECTED'
  | 'HEALTHY_ONLINE'
  | 'HEALTHY_COMPLETED';

export type DiagnoseFinding = {
  code: DiagnoseVerdictCode | 'MAC_REUSED' | 'RAPID_RETRIES';
  severity: DiagnoseSeverity;
  title: string;
  detail: string;
};

export type DiagnoseVerdict = {
  code: DiagnoseVerdictCode;
  severity: DiagnoseSeverity;
  title: string;
  summary: string;
  actions: string[];
};

export type DiagnoseTimelineEvent = {
  at: string;
  kind: 'captive' | 'accept' | 'reject' | 'radius-start' | 'radius-interim' | 'radius-stop';
  label: string;
  detail: string | null;
};

type SessionLike = {
  id: string;
  userName: string | null;
  status: string;
  acctSessionId: string;
  callingStationId: string | null;
  framedIpAddress: string | null;
  nasIpAddress: string | null;
  nasIdentifier: string | null;
  startedAt: Date;
  createdAt?: Date;
  lastInterimAt: Date | null;
  stoppedAt: Date | null;
  sessionTimeSec: number | null;
  inputBytes: bigint | null;
  outputBytes: bigint | null;
  totalBytes: bigint | null;
  terminateCause: string | null;
  archived?: boolean;
};

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function asNumber(value: bigint | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'bigint') return Number(value);
  return value;
}

function wallSeconds(startedAt: Date, endedAt: Date | null, now: Date): number {
  const end = endedAt ?? now;
  return Math.max(0, Math.floor((end.getTime() - startedAt.getTime()) / 1000));
}

function isDataCapBytes(totalBytes: number | null, planDataMb: number | null): boolean {
  if (totalBytes == null || totalBytes <= 0) return false;
  if (Math.abs(totalBytes - BYTES_500_MIB) <= DATA_CAP_BYTE_SLACK) return true;
  if (planDataMb != null && planDataMb > 0) {
    const expected = planDataMb * 1024 * 1024;
    if (Math.abs(totalBytes - expected) <= DATA_CAP_BYTE_SLACK) return true;
  }
  return false;
}

function isInflated(session: SessionLike, now: Date): boolean {
  const wall = wallSeconds(session.startedAt, session.stoppedAt, now);
  const nas = session.sessionTimeSec ?? 0;
  return nas > wall + 120 && nas > wall * 2;
}

function serializeSession(session: SessionLike, now: Date) {
  const wall = wallSeconds(session.startedAt, session.stoppedAt, now);
  const billed = billedSessionSeconds(
    session.sessionTimeSec,
    session.startedAt,
    session.stoppedAt ?? now,
    { createdAt: session.createdAt ?? null, stoppedAt: session.stoppedAt },
  );
  return {
    id: session.id,
    userName: session.userName,
    status: session.status,
    acctSessionId: session.acctSessionId,
    callingStationId: session.callingStationId,
    framedIpAddress: session.framedIpAddress,
    nasIpAddress: session.nasIpAddress,
    nasIdentifier: session.nasIdentifier,
    startedAt: session.startedAt.toISOString(),
    lastInterimAt: iso(session.lastInterimAt),
    stoppedAt: iso(session.stoppedAt),
    sessionTimeSec: session.sessionTimeSec,
    wallSeconds: wall,
    billedSeconds: billed,
    inflated: isInflated(session, now),
    inputBytes: asNumber(session.inputBytes),
    outputBytes: asNumber(session.outputBytes),
    totalBytes: asNumber(session.totalBytes),
    terminateCause: session.terminateCause,
    archived: Boolean(session.archived),
  };
}

function authOutcome(reply: string | null): 'ACCEPT' | 'REJECT' | 'UNKNOWN' {
  const text = (reply ?? '').toLowerCase();
  if (text.includes('reject')) return 'REJECT';
  if (text.includes('accept')) return 'ACCEPT';
  return 'UNKNOWN';
}

function buildVerdict(args: {
  found: boolean;
  captiveCount: number;
  acceptCount: number;
  rejectCount: number;
  radiusCount: number;
  online: boolean;
  dataCap: boolean;
  inflated: boolean;
  firstSessionMissing: boolean;
}): { verdict: DiagnoseVerdict; extra: DiagnoseFinding[] } {
  const extra: DiagnoseFinding[] = [];

  if (!args.found) {
    return {
      verdict: {
        code: 'NOT_FOUND',
        severity: 'error',
        title: 'Token not found',
        summary:
          'No credential matches this code in the selected tenant (or it is outside your site / partner scope).',
        actions: ['Confirm the code, tenant, and that the token was sold in this organization.'],
      },
      extra,
    };
  }

  if (args.acceptCount === 0 && args.rejectCount > 0 && args.radiusCount === 0) {
    return {
      verdict: {
        code: 'REJECTED',
        severity: 'error',
        title: 'RADIUS rejected the token',
        summary:
          'NAS/captive reached FreeRADIUS, but all Access-Requests were answered with Access-Reject. No billed session was created.',
        actions: [
          'Open Auth Events and check the reject reply (expired / consumed / wrong password / simultaneous-use).',
          'No RADIUS session will exist until an Access-Accept appears.',
        ],
      },
      extra,
    };
  }

  if (args.acceptCount > 0 && args.radiusCount === 0) {
    return {
      verdict: {
        code: 'AUTH_WITHOUT_ACCOUNTING',
        severity: 'error',
        title: 'Access-Accept but no accounting',
        summary:
          'FreeRADIUS returned Access-Accept (UDP 1812), but Accounting-Start never arrived (UDP 1813). The phone likely never became an active hotspot user (leftover hotspot host/cookie, already authorizing, or radius-accounting disabled).',
        actions: [
          'On the site router: confirm `/ip hotspot profile` has `login-by=http-pap` and `radius-accounting=yes`.',
          'Confirm UDP 1812/1813 are reachable (router /radius settings, timeouts).',
          'Clear leftover `/ip hotspot cookie` and `/ip hotspot host` for this MAC, then retry.',
        ],
      },
      extra,
    };
  }

  if (args.captiveCount > 0 && args.acceptCount === 0 && args.radiusCount === 0) {
    return {
      verdict: {
        code: 'PORTAL_WITHOUT_RADIUS_AUTH',
        severity: 'error',
        title: 'Portal success but no RADIUS auth',
        summary:
          'Captive portal recorded success, but MikroTik never sent Access-Request. The phone likely never finished the hotspot login handoff, or cookie/CHAP blocked the PAP flow.',
        actions: [
          'Verify hotspot HTML posts to `/login` with `http-pap` (no http-chap handoff, no cookie/CHAP blocking).',
          'Check walled garden / DNS for portal access, then retry after forgetting Wi-Fi.',
        ],
      },
      extra,
    };
  }

  if (args.captiveCount === 0 && args.acceptCount === 0 && args.radiusCount === 0) {
    return {
      verdict: {
        code: 'UNUSED',
        severity: 'info',
        title: 'Token has not been used on a NAS',
        summary: 'No captive portal login, no radpostauth, and no accounting rows were recorded for this token.',
        actions: ['Ask the customer to connect to the site Wi‑Fi and open the captive portal.'],
      },
      extra,
    };
  }

  if (args.dataCap) {
    extra.push({
      code: 'DATA_CAP_DISCONNECT',
      severity: 'warning',
      title: 'Per-session data cap',
      detail:
        'One or more STOP rows hit a round byte limit (often 500 MB / Mikrotik-Total-Limit). That cap resets on every new Access-Accept, so the user is kicked and can log in again.',
    });
  }

  if (args.inflated) {
    extra.push({
      code: 'INFLATED_SESSION_TIME',
      severity: 'warning',
      title: 'NAS over-reported session time',
      detail:
        'Acct-Session-Time is far larger than login→logout clock time (leftover hotspot host uptime or Session-Timeout copied into STOP). Billing should use wall clock, not the NAS value.',
    });
  }

  if (args.firstSessionMissing) {
    return {
      verdict: {
        code: 'FIRST_SESSION_MISSING',
        severity: 'warning',
        title: 'First accounting row missing',
        summary:
          'An Access-Accept happened before any Accounting-Start row. The first online period may be unbilled because Accounting-Start was lost, or the host was already authorized without creating a new session.',
        actions: [
          'Clear hotspot host/cookie for the MAC after voucher changes.',
          'Confirm `radius-accounting=yes` and UDP 1813 is reachable.',
          'This missing first accounting period cannot be backfilled automatically.',
        ],
      },
      extra,
    };
  }

  if (args.dataCap) {
    return {
      verdict: {
        code: 'DATA_CAP_DISCONNECT',
        severity: 'warning',
        title: 'Disconnected at a data cap',
        summary:
          'Sessions stop at a fixed byte limit (commonly 500 MB). Idle-Timeout is not the cause. Adjust plan RADIUS policy limits (e.g. remove/override `Mikrotik-Total-Limit`) if this plan should not be capped per session.',
        actions: [
          'Open Plan RADIUS Policies for this plan + MikroTik.',
          'If the plan is time-only, remove `Mikrotik-Total-Limit` (and Recv/Xmit limits).',
        ],
      },
      extra,
    };
  }

  if (args.inflated) {
    return {
      verdict: {
        code: 'INFLATED_SESSION_TIME',
        severity: 'warning',
        title: 'Billed time looks inflated',
        summary:
          'The NAS reported full plan duration on a session that lasted only a short time. This is usually caused by leftover hotspot host/cookie uptime being reused for billing.',
        actions: [
          'On the router, remove `/ip hotspot host` and `/ip hotspot cookie` for this MAC after a voucher change.',
          'If the token was marked Consumed, revert to sold (developer) or issue a replacement.',
        ],
      },
      extra,
    };
  }

  if (args.online) {
    return {
      verdict: {
        code: 'HEALTHY_ONLINE',
        severity: 'ok',
        title: 'Session looks healthy (online)',
        summary:
          'Captive login, Access-Accept, and an active RADIUS session exist. Accounting is arriving.',
        actions: [],
      },
      extra,
    };
  }

  return {
    verdict: {
      code: 'HEALTHY_COMPLETED',
      severity: 'ok',
      title: 'Session looks healthy',
      summary: 'Access-Accept and accounting both exist for this token (no captive-without-RADIUS gap detected).',
      actions: extra.length
        ? extra.map((f) => f.detail)
        : ['No further network action required for this code.'],
    },
    extra,
  };
}

export async function diagnoseAccessToken(
  prisma: PrismaClient,
  input: {
    orgId: string;
    code: string;
    resellerId?: string;
    allowedStationIds: string[] | null;
  }
) {
  const code = input.code.trim();
  const now = new Date();

  const credential = await prisma.credential.findFirst({
    where: {
      orgId: input.orgId,
      deletedAt: null,
      ...(input.resellerId ? { resellerId: input.resellerId } : {}),
      ...(input.allowedStationIds ? { stationId: { in: input.allowedStationIds } } : {}),
      OR: [
        { token: { equals: code, mode: 'insensitive' } },
        { username: { equals: code, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      token: true,
      username: true,
      status: true,
      orgId: true,
      stationId: true,
      resellerId: true,
      soldAt: true,
      activatedAt: true,
      expiresAt: true,
      revokedAt: true,
      timeRemainingSec: true,
      dataRemainingMb: true,
      plan: {
        select: {
          id: true,
          code: true,
          name: true,
          quotaType: true,
          timeAmount: true,
          timeUnit: true,
          dataMb: true,
        },
      },
      station: {
        select: { id: true, code: true, name: true, nasIdentifier: true },
      },
      reseller: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  if (!credential) {
    const { verdict } = buildVerdict({
      found: false,
      captiveCount: 0,
      acceptCount: 0,
      rejectCount: 0,
      radiusCount: 0,
      online: false,
      dataCap: false,
      inflated: false,
      firstSessionMissing: false,
    });
    return {
      code,
      found: false,
      verdict,
      findings: [] as DiagnoseFinding[],
      counts: { captive: 0, accept: 0, reject: 0, radiusSessions: 0, archiveSessions: 0 },
      token: null,
      timeline: [] as DiagnoseTimelineEvent[],
      captiveLogins: [],
      authEvents: [],
      radiusSessions: [],
      relatedMacActivity: [],
    };
  }

  const userNames = radiusUserNameVariants(credential);
  const sessionWhere = {
    OR: [
      { credentialId: credential.id },
      ...(userNames.length > 0
        ? [{ credentialId: null as string | null, userName: { in: userNames } }]
        : []),
    ],
    AND: [{ OR: [{ orgId: input.orgId }, { orgId: null }] }],
  };

  const [captiveRows, authRows, hotSessions, archiveSessions] = await Promise.all([
    prisma.captivePortalSession.findMany({
      where: { credentialId: credential.id, orgId: input.orgId },
      select: { id: true, username: true, ip: true, mac: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: CAPTIVE_PREVIEW_LIMIT,
    }),
    userNames.length > 0
      ? prisma.radpostauth.findMany({
          where: {
            OR: userNames.map((username) => ({
              username: { equals: username, mode: 'insensitive' as const },
            })),
          },
          select: {
            id: true,
            username: true,
            reply: true,
            callingStationId: true,
            calledStationId: true,
            authdate: true,
          },
          orderBy: { authdate: 'asc' },
          take: AUTH_PREVIEW_LIMIT,
        })
      : Promise.resolve([]),
    prisma.radiusSession.findMany({
      where: sessionWhere,
      orderBy: { startedAt: 'asc' },
      take: RADIUS_PREVIEW_LIMIT,
    }),
    prisma.radiusSessionArchive.findMany({
      where: sessionWhere,
      orderBy: { startedAt: 'asc' },
      take: RADIUS_PREVIEW_LIMIT,
    }),
  ]);

  const sessions: SessionLike[] = [
    ...hotSessions.map((row) => ({ ...row, archived: false })),
    ...archiveSessions.map((row) => ({ ...row, archived: true })),
  ].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  const acceptCount = authRows.filter((row) => authOutcome(row.reply) === 'ACCEPT').length;
  const rejectCount = authRows.filter((row) => authOutcome(row.reply) === 'REJECT').length;
  const online = sessions.some((row) => row.stoppedAt == null && row.status !== 'STOP');
  const dataCap = sessions.some((row) =>
    isDataCapBytes(asNumber(row.totalBytes), credential.plan.dataMb)
  );
  const inflated = sessions.some((row) => isInflated(row, now));

  const firstCaptive = captiveRows[0]?.createdAt ?? null;
  const firstAccept = authRows.find((row) => authOutcome(row.reply) === 'ACCEPT')?.authdate ?? null;
  const firstAuthAt = firstCaptive ?? firstAccept;
  const firstRadiusAt = sessions[0]?.startedAt ?? null;
  const firstSessionMissing = Boolean(
    firstAuthAt &&
      firstRadiusAt &&
      firstRadiusAt.getTime() - firstAuthAt.getTime() > 60_000 &&
      (captiveRows.length > 1 || acceptCount > 1)
  );

  const { verdict, extra } = buildVerdict({
    found: true,
    captiveCount: captiveRows.length,
    acceptCount,
    rejectCount,
    radiusCount: sessions.length,
    online,
    dataCap,
    inflated,
    firstSessionMissing,
  });

  const findings: DiagnoseFinding[] = [...extra];
  if (captiveRows.length >= 8 && acceptCount >= 8 && sessions.length === 0) {
    findings.push({
      code: 'RAPID_RETRIES',
      severity: 'warning',
      title: 'Repeated captive retries',
      detail: `${captiveRows.length} portal logins and ${acceptCount} Access-Accepts with no accounting. The phone kept failing to join /ip hotspot active.`,
    });
  }

  const macs = [
    ...new Set(
      [
        ...captiveRows.map((row) => normalizeMacKey(row.mac)),
        ...sessions.map((row) => normalizeMacKey(row.callingStationId)),
      ].filter((mac): mac is string => Boolean(mac))
    ),
  ];

  let relatedMacActivity: Array<{
    userName: string | null;
    status: string;
    acctSessionId: string;
    callingStationId: string | null;
    nasIdentifier: string | null;
    startedAt: string;
    stoppedAt: string | null;
    terminateCause: string | null;
  }> = [];

  if (macs.length > 0) {
    const related = await prisma.radiusSession.findMany({
      where: {
        OR: [{ orgId: input.orgId }, { orgId: null }],
        credentialId: { not: credential.id },
        callingStationId: { not: null },
      },
      select: {
        userName: true,
        status: true,
        acctSessionId: true,
        callingStationId: true,
        nasIdentifier: true,
        startedAt: true,
        stoppedAt: true,
        terminateCause: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 80,
    });
    relatedMacActivity = related
      .filter((row) => {
        const key = normalizeMacKey(row.callingStationId);
        return key != null && macs.includes(key);
      })
      .slice(0, RELATED_MAC_LIMIT)
      .map((row) => ({
        userName: row.userName,
        status: row.status,
        acctSessionId: row.acctSessionId,
        callingStationId: row.callingStationId,
        nasIdentifier: row.nasIdentifier,
        startedAt: row.startedAt.toISOString(),
        stoppedAt: iso(row.stoppedAt),
        terminateCause: row.terminateCause,
      }));
    if (relatedMacActivity.length > 0) {
      findings.push({
        code: 'MAC_REUSED',
        severity: 'info',
        title: 'Same MAC used other tokens',
        detail: `This device has RADIUS sessions on other vouchers (${relatedMacActivity
          .map((row) => row.userName)
          .filter(Boolean)
          .slice(0, 5)
          .join(', ')}). Leftover hotspot host/cookie from those logins can block a new token.`,
      });
    }
  }

  const timeline: DiagnoseTimelineEvent[] = [];
  for (const row of captiveRows) {
    timeline.push({
      at: row.createdAt.toISOString(),
      kind: 'captive',
      label: 'Captive portal login',
      detail: [row.mac, row.ip].filter(Boolean).join(' · ') || null,
    });
  }
  for (const row of authRows) {
    const outcome = authOutcome(row.reply);
    timeline.push({
      at: row.authdate.toISOString(),
      kind: outcome === 'REJECT' ? 'reject' : 'accept',
      label: row.reply ?? outcome,
      detail: row.callingStationId,
    });
  }
  for (const row of sessions) {
    const kind =
      row.status === 'STOP' || row.stoppedAt
        ? 'radius-stop'
        : row.status === 'INTERIM'
          ? 'radius-interim'
          : 'radius-start';
    timeline.push({
      at: row.startedAt.toISOString(),
      kind,
      label: `RADIUS ${row.status}${row.archived ? ' (archive)' : ''}`,
      detail: [row.acctSessionId, row.nasIdentifier, row.terminateCause].filter(Boolean).join(' · ') || null,
    });
  }
  timeline.sort((a, b) => a.at.localeCompare(b.at));

  const quotaSec = planTimeQuotaSec(credential.plan);

  return {
    code: credential.token ?? credential.username ?? code,
    found: true,
    verdict,
    findings,
    counts: {
      captive: captiveRows.length,
      accept: acceptCount,
      reject: rejectCount,
      radiusSessions: hotSessions.length,
      archiveSessions: archiveSessions.length,
    },
    token: {
      id: credential.id,
      token: credential.token,
      username: credential.username,
      status: credential.status,
      soldAt: iso(credential.soldAt),
      activatedAt: iso(credential.activatedAt),
      expiresAt: iso(credential.expiresAt),
      revokedAt: iso(credential.revokedAt),
      timeRemainingSec: credential.timeRemainingSec,
      dataRemainingMb: credential.dataRemainingMb,
      planQuotaSec: quotaSec,
      planDataMb: credential.plan.dataMb,
      plan: {
        id: credential.plan.id,
        code: credential.plan.code,
        name: credential.plan.name,
        quotaType: credential.plan.quotaType,
      },
      station: credential.station,
      reseller: credential.reseller,
    },
    timeline,
    captiveLogins: captiveRows.map((row) => ({
      id: row.id,
      username: row.username,
      ip: row.ip,
      mac: row.mac,
      createdAt: row.createdAt.toISOString(),
    })),
    authEvents: authRows.map((row) => ({
      id: row.id.toString(),
      username: row.username,
      reply: row.reply,
      outcome: authOutcome(row.reply),
      callingStationId: row.callingStationId,
      calledStationId: row.calledStationId,
      authdate: row.authdate.toISOString(),
    })),
    radiusSessions: sessions.map((row) => serializeSession(row, now)),
    relatedMacActivity,
  };
}
