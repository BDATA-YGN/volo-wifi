import crypto from 'crypto';
import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { appDayKey, startOfAppDay } from '@/utils/app-time';
import { isDeveloperAdmin, resolveOrgIdForAdmin } from '@/features/wifi/shared/resolve-org';
import {
  resolveAllowedStationIds,
  stationPkScope,
} from '@/features/wifi/shared/resolve-station-scope';
import {
  loadOrgMembershipsForAdmin,
  loadResellerPicker,
  resolveDirectReseller,
  resolveResellerContext,
  resolveRoleScopedReseller,
} from '@/features/wifi/commerce/shared/resolve-reseller';
import { resolveRetailPrice } from '@/features/wifi/commerce/shared/resolve-retail-price';
import {
  CAPTIVE_SESSION_PREVIEW_LIMIT,
  RADIUS_SESSION_PREVIEW_LIMIT,
  CREDENTIAL_STATUSES,
  type CredentialStatus,
} from './constants';
import { loadAccessTokenRevokeWindowMinutes } from './commerce-settings';
import {
  assertCredentialActionAllowed,
  resolveCredentialActions,
  type CredentialPermissionContext,
} from './credential-permissions';
import {
  allowNewDeviceAccessToken,
  pauseAccessToken,
  revertAccessTokenToSold,
  unlockAccessToken,
} from './credential-lifecycle';
import { CommerceAccessTokensActionSchema, CommerceAccessTokensIssueSchema } from './schema';
import { revokeAccessToken } from './revoke-access-token';
import { generateUniqueAlphanumericToken } from '@/features/shared/credentials/voucher-token';
import {
  countAvailableVoucherSlots,
  formatInsufficientVoucherInventoryMessage,
  InsufficientVoucherInventoryError,
  reserveVoucherBatchSlots,
} from './voucher-inventory';
import {
  radiusSessionUsageWhere,
  radiusUserNameVariants,
} from '@/features/shared/credentials/credential-sync.helpers';
import {
  loadOpsArchiveSettings,
  OPS_ARCHIVE_DEFAULTS,
} from '@/jobs/reporting/lib/ops-archive-settings';

const credentialSelect = {
  id: true,
  orgId: true,
  type: true,
  status: true,
  token: true,
  username: true,
  planId: true,
  stationId: true,
  resellerId: true,
  soldAt: true,
  activatedAt: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
  plan: {
    select: { id: true, code: true, name: true, quotaType: true, isActive: true },
  },
  station: {
    select: { id: true, code: true, name: true, status: true },
  },
  reseller: {
    select: { id: true, code: true, name: true, status: true },
  },
  salesItems: {
    take: 1,
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      unitPrice: true,
      lineTotal: true,
      order: {
        select: {
          id: true,
          orderNo: true,
          status: true,
          total: true,
          currency: true,
          soldAt: true,
        },
      },
    },
  },
  _count: {
    select: { captivePortalSessions: true },
  },
} satisfies Prisma.CredentialSelect;

type CredentialRow = Prisma.CredentialGetPayload<{ select: typeof credentialSelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function startOfUtcDay(date = new Date()): Date {
  return startOfAppDay(date);
}

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function serializeCredential(
  row: CredentialRow,
  permissionCtx: CredentialPermissionContext,
  revokeWindowMinutes: number,
  firstLoginAt?: Date | null
) {
  const saleItem = row.salesItems[0];
  const actions = resolveCredentialActions(
    permissionCtx,
    { status: row.status, soldAt: row.soldAt },
    revokeWindowMinutes
  );
  const resolvedFirstLogin = firstLoginAt ?? row.activatedAt;
  return {
    id: row.id,
    orgId: row.orgId,
    type: row.type,
    status: row.status,
    token: row.token,
    planId: row.planId,
    stationId: row.stationId,
    resellerId: row.resellerId,
    plan: row.plan,
    station: row.station,
    reseller: row.reseller,
    soldAt: row.soldAt?.toISOString() ?? null,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    firstLoginAt: resolvedFirstLogin?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    captiveSessionCount: row._count.captivePortalSessions,
    actions,
    sale: saleItem
      ? {
          itemId: saleItem.id,
          unitPrice: decimalToNumber(saleItem.unitPrice),
          lineTotal: decimalToNumber(saleItem.lineTotal),
          order: {
            ...saleItem.order,
            total: decimalToNumber(saleItem.order.total),
            soldAt: saleItem.order.soldAt?.toISOString() ?? null,
          },
        }
      : null,
  };
}

function takeEarlier(map: Map<string, Date>, id: string, at: Date | null | undefined) {
  if (!at) return;
  const prev = map.get(id);
  if (!prev || at.getTime() < prev.getTime()) {
    map.set(id, at);
  }
}

/**
 * Earliest login time from captive portal and/or RADIUS sessions (hot + archive).
 * Falls back to credential.activatedAt when session rows were purged.
 */
async function loadFirstLoginAtMap(
  prisma: PrismaClient,
  orgId: string,
  credentials: Array<{
    id: string;
    token: string | null;
    username: string | null;
    activatedAt: Date | null;
  }>
): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  if (credentials.length === 0) return map;

  for (const c of credentials) {
    takeEarlier(map, c.id, c.activatedAt);
  }

  const ids = credentials.map((c) => c.id);
  const userNameToCredentialId = new Map<string, string>();
  for (const c of credentials) {
    for (const variant of radiusUserNameVariants(c)) {
      userNameToCredentialId.set(variant, c.id);
    }
  }
  const userNames = [...userNameToCredentialId.keys()];

  const [captiveMins, radiusByCredHot, radiusByCredArchive, radiusByUserHot, radiusByUserArchive] =
    await Promise.all([
      prisma.captivePortalSession.groupBy({
        by: ['credentialId'],
        where: { orgId, credentialId: { in: ids } },
        _min: { createdAt: true },
      }),
      prisma.radiusSession.groupBy({
        by: ['credentialId'],
        where: { credentialId: { in: ids } },
        _min: { startedAt: true },
      }),
      prisma.radiusSessionArchive.groupBy({
        by: ['credentialId'],
        where: { credentialId: { in: ids } },
        _min: { startedAt: true },
      }),
      userNames.length > 0
        ? prisma.radiusSession.groupBy({
            by: ['userName'],
            where: { userName: { in: userNames } },
            _min: { startedAt: true },
          })
        : Promise.resolve([]),
      userNames.length > 0
        ? prisma.radiusSessionArchive.groupBy({
            by: ['userName'],
            where: { userName: { in: userNames } },
            _min: { startedAt: true },
          })
        : Promise.resolve([]),
    ]);

  for (const row of captiveMins) {
    takeEarlier(map, row.credentialId, row._min.createdAt);
  }
  for (const row of radiusByCredHot) {
    if (row.credentialId) takeEarlier(map, row.credentialId, row._min.startedAt);
  }
  for (const row of radiusByCredArchive) {
    if (row.credentialId) takeEarlier(map, row.credentialId, row._min.startedAt);
  }
  for (const row of radiusByUserHot) {
    if (!row.userName) continue;
    const credentialId = userNameToCredentialId.get(row.userName);
    if (credentialId) takeEarlier(map, credentialId, row._min.startedAt);
  }
  for (const row of radiusByUserArchive) {
    if (!row.userName) continue;
    const credentialId = userNameToCredentialId.get(row.userName);
    if (credentialId) takeEarlier(map, credentialId, row._min.startedAt);
  }

  return map;
}

function revokeSuccessMessage(result: Awaited<ReturnType<typeof revokeAccessToken>>): string {
  if (result.orderStatus === 'REFUNDED') {
    return 'Access token revoked and linked sale refunded';
  }
  if (result.refundedAmount != null && result.refundedAmount > 0) {
    return 'Access token revoked and linked payment adjusted';
  }
  return 'Access token revoked';
}

const radiusSessionSelect = {
  id: true,
  status: true,
  userName: true,
  callingStationId: true,
  framedIpAddress: true,
  nasIpAddress: true,
  nasIdentifier: true,
  startedAt: true,
  lastInterimAt: true,
  stoppedAt: true,
  sessionTimeSec: true,
  inputBytes: true,
  outputBytes: true,
  totalBytes: true,
  terminateCause: true,
} satisfies Prisma.RadiusSessionSelect;

function serializeRadiusSessionRow(
  row: {
    id: string;
    status: string;
    userName: string | null;
    callingStationId: string | null;
    framedIpAddress: string | null;
    nasIpAddress: string | null;
    nasIdentifier: string | null;
    startedAt: Date;
    lastInterimAt: Date | null;
    stoppedAt: Date | null;
    sessionTimeSec: number | null;
    inputBytes: bigint | null;
    outputBytes: bigint | null;
    totalBytes: bigint | null;
    terminateCause: string | null;
  },
  source: 'hot' | 'archive'
) {
  return {
    id: row.id,
    source,
    status: row.status,
    userName: row.userName,
    callingStationId: row.callingStationId,
    framedIpAddress: row.framedIpAddress,
    nasIpAddress: row.nasIpAddress,
    nasIdentifier: row.nasIdentifier,
    startedAt: row.startedAt.toISOString(),
    lastInterimAt: row.lastInterimAt?.toISOString() ?? null,
    stoppedAt: row.stoppedAt?.toISOString() ?? null,
    sessionTimeSec: row.sessionTimeSec,
    inputBytes: row.inputBytes != null ? row.inputBytes.toString() : null,
    outputBytes: row.outputBytes != null ? row.outputBytes.toString() : null,
    totalBytes: row.totalBytes != null ? row.totalBytes.toString() : null,
    terminateCause: row.terminateCause,
  };
}

function buildSessionsEmptyMessage(opts: {
  hasCaptive: boolean;
  hasRadius: boolean;
  wasUsed: boolean;
  captiveRetentionDays: number;
  radiusHotRetentionDays: number;
  radiusArchiveRetentionDays: number;
}): string | null {
  if (opts.hasCaptive || opts.hasRadius) return null;
  if (!opts.wasUsed) {
    return 'No portal or network sessions recorded yet.';
  }
  const archiveNote =
    opts.radiusArchiveRetentionDays > 0
      ? ` Completed RADIUS sessions are archived after ${opts.radiusHotRetentionDays} days and purged after ${opts.radiusArchiveRetentionDays} days.`
      : ` Completed RADIUS sessions are archived after ${opts.radiusHotRetentionDays} days.`;
  return (
    `No recent sessions remain in the live store. Captive portal logins are removed after ${opts.captiveRetentionDays} days.` +
    archiveNote
  );
}

async function loadTokenSessionHistory(
  prisma: PrismaClient,
  orgId: string,
  credential: {
    id: string;
    username: string | null;
    token: string | null;
    status: string;
    activatedAt: Date | null;
  }
) {
  const userNameVariants = radiusUserNameVariants(credential);
  const radiusWhere = {
    AND: [
      radiusSessionUsageWhere(credential),
      { OR: [{ orgId }, { orgId: null }] },
    ],
  };

  const [
    captiveSessions,
    captiveSessionsTotal,
    hotSessions,
    hotTotal,
    archiveSessions,
    archiveTotal,
    archiveSettings,
  ] = await Promise.all([
    prisma.captivePortalSession.findMany({
      where: { credentialId: credential.id, orgId },
      select: {
        id: true,
        username: true,
        ip: true,
        mac: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: CAPTIVE_SESSION_PREVIEW_LIMIT,
    }),
    prisma.captivePortalSession.count({
      where: { credentialId: credential.id, orgId },
    }),
    userNameVariants.length > 0
      ? prisma.radiusSession.findMany({
          where: radiusWhere,
          select: radiusSessionSelect,
          orderBy: { startedAt: 'desc' },
          take: RADIUS_SESSION_PREVIEW_LIMIT,
        })
      : Promise.resolve([]),
    userNameVariants.length > 0
      ? prisma.radiusSession.count({ where: radiusWhere })
      : Promise.resolve(0),
    userNameVariants.length > 0
      ? prisma.radiusSessionArchive.findMany({
          where: radiusWhere,
          select: {
            id: true,
            status: true,
            userName: true,
            callingStationId: true,
            framedIpAddress: true,
            nasIpAddress: true,
            nasIdentifier: true,
            startedAt: true,
            lastInterimAt: true,
            stoppedAt: true,
            sessionTimeSec: true,
            inputBytes: true,
            outputBytes: true,
            totalBytes: true,
            terminateCause: true,
          },
          orderBy: { startedAt: 'desc' },
          take: RADIUS_SESSION_PREVIEW_LIMIT,
        })
      : Promise.resolve([]),
    userNameVariants.length > 0
      ? prisma.radiusSessionArchive.count({ where: radiusWhere })
      : Promise.resolve(0),
    loadOpsArchiveSettings(prisma).catch(() => OPS_ARCHIVE_DEFAULTS),
  ]);

  const mergedRadius = [
    ...hotSessions.map((s) => serializeRadiusSessionRow(s, 'hot')),
    ...archiveSessions.map((s) => serializeRadiusSessionRow(s, 'archive')),
  ]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, RADIUS_SESSION_PREVIEW_LIMIT);

  const radiusSessionsTotal = hotTotal + archiveTotal;
  const wasUsed =
    Boolean(credential.activatedAt) ||
    ['ACTIVATED', 'CONSUMED', 'EXPIRED', 'PAUSED'].includes(credential.status);

  return {
    captiveSessions: captiveSessions.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    captiveSessionsTotal,
    captiveSessionsTruncated: captiveSessionsTotal > CAPTIVE_SESSION_PREVIEW_LIMIT,
    radiusSessions: mergedRadius,
    radiusSessionsTotal,
    radiusSessionsTruncated: radiusSessionsTotal > RADIUS_SESSION_PREVIEW_LIMIT,
    radiusSessionsHotTotal: hotTotal,
    radiusSessionsArchiveTotal: archiveTotal,
    sessionsMeta: {
      captiveRetentionDays: archiveSettings.captivePortalRetentionDays,
      radiusHotRetentionDays: archiveSettings.radiusSessionHotRetentionDays,
      radiusArchiveRetentionDays: archiveSettings.radiusSessionArchiveRetentionDays,
      emptyStateMessage: buildSessionsEmptyMessage({
        hasCaptive: captiveSessionsTotal > 0,
        hasRadius: radiusSessionsTotal > 0,
        wasUsed,
        captiveRetentionDays: archiveSettings.captivePortalRetentionDays,
        radiusHotRetentionDays: archiveSettings.radiusSessionHotRetentionDays,
        radiusArchiveRetentionDays: archiveSettings.radiusSessionArchiveRetentionDays,
      }),
    },
  };
}

function generateOrderNo(): string {
  const date = appDayKey(new Date()).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `SO-${date}-${rand}`;
}

function queryResellerParams(query: AuthenticatedRequest['query']) {
  return {
    orgId: typeof query.orgId === 'string' ? query.orgId : undefined,
    resellerId: typeof query.resellerId === 'string' ? query.resellerId : undefined,
  };
}

async function loadSellableCatalog(
  prisma: PrismaClient,
  orgId: string,
  resellerId: string,
  allowedStationIds: string[] | null = null
) {
  const [stations, entitlements, org] = await Promise.all([
    prisma.resellerStation.findMany({
      where: { orgId, resellerId, deletedAt: null },
      select: {
        station: {
          select: { id: true, code: true, name: true, status: true },
        },
      },
      orderBy: { station: { name: 'asc' } },
    }),
    prisma.resellerPlanEntitlement.findMany({
      where: { resellerId, isEnabled: true, plan: { orgId, deletedAt: null, isActive: true } },
      select: {
        planId: true,
        plan: {
          select: { id: true, code: true, name: true, quotaType: true, isActive: true },
        },
      },
      orderBy: { plan: { name: 'asc' } },
    }),
    prisma.org.findUnique({
      where: { id: orgId },
      select: { currency: true },
    }),
  ]);

  const stationRows = stations
    .map((s) => s.station)
    .filter(
      (s) =>
        s.status !== 'DISABLED' && (!allowedStationIds || allowedStationIds.includes(s.id))
    );

  const plans = await Promise.all(
    entitlements.map(async (ent) => {
      const pricesByStation: Record<string, number> = {};
      for (const station of stationRows) {
        const resolved = await resolveRetailPrice(
          prisma,
          orgId,
          resellerId,
          station.id,
          ent.planId
        );
        if (resolved) {
          pricesByStation[station.id] = decimalToNumber(resolved.price);
        }
      }
      const pricedValues = Object.values(pricesByStation);
      const unitPrice = pricedValues.length > 0 ? pricedValues[0]! : null;
      return {
        ...ent.plan,
        unitPrice,
        hasPricing: pricedValues.length > 0,
        pricesByStation,
      };
    })
  );

  return {
    currency: org?.currency ?? 'MMK',
    stations: stationRows,
    plans,
    canSell: stationRows.length > 0 && plans.some((p) => p.hasPricing),
  };
}

/** Org-wide plan/site filters when no partner is selected (admin list-all view). */
async function loadOrgFilterCatalog(
  prisma: PrismaClient,
  orgId: string,
  allowedStationIds: string[] | null = null
) {
  const [stations, plans, org] = await Promise.all([
    prisma.wifiStation.findMany({
      where: {
        orgId,
        deletedAt: null,
        status: { not: 'DISABLED' },
        ...stationPkScope(allowedStationIds),
      },
      select: { id: true, code: true, name: true, status: true },
      orderBy: { name: 'asc' },
    }),
    prisma.plan.findMany({
      where: { orgId, deletedAt: null, isActive: true },
      select: { id: true, code: true, name: true, quotaType: true, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.org.findUnique({
      where: { id: orgId },
      select: { currency: true },
    }),
  ]);

  return {
    currency: org?.currency ?? 'MMK',
    stations,
    plans: plans.map((p) => ({
      ...p,
      unitPrice: null as number | null,
      hasPricing: false,
      pricesByStation: {} as Record<string, number>,
    })),
    canSell: false,
  };
}

type AccessTokensListScope =
  | {
      orgId: string;
      resellerId: string | null;
      mode: 'partner' | 'preview';
      partnerLocked: boolean;
      resellers?: Awaited<ReturnType<typeof loadResellerPicker>>;
      memberships?: Awaited<ReturnType<typeof loadOrgMembershipsForAdmin>>;
    }
  | { requiresOrgSelection: true; memberships: Awaited<ReturnType<typeof loadOrgMembershipsForAdmin>> };

/**
 * List/filter scope for Access Tokens.
 * Partner logins are locked to their reseller; admins may omit partner to see all org tokens.
 */
async function resolveAccessTokensListScope(
  prisma: PrismaClient,
  adminId: string,
  user: AuthenticatedRequest['user'],
  query: { orgId?: string; resellerId?: string },
): Promise<AccessTokensListScope> {
  const requestedResellerId = query.resellerId?.trim() ?? '';
  const requestedOrgId = query.orgId?.trim() ?? '';

  const direct = await resolveDirectReseller(prisma, adminId);
  if (direct) {
    if (requestedResellerId && requestedResellerId !== direct.resellerId) {
      throw Object.assign(new Error('You do not have access to this partner account.'), {
        status: 403,
        code: 'FORBIDDEN_RESELLER',
      });
    }
    return {
      orgId: direct.orgId,
      resellerId: direct.resellerId,
      mode: 'partner',
      partnerLocked: true,
    };
  }

  const scoped = await resolveRoleScopedReseller(prisma, adminId);
  if (scoped) {
    if (requestedResellerId && requestedResellerId !== scoped.resellerId) {
      throw Object.assign(new Error('You do not have access to this partner account.'), {
        status: 403,
        code: 'FORBIDDEN_RESELLER',
      });
    }
    return {
      orgId: scoped.orgId,
      resellerId: scoped.resellerId,
      mode: 'partner',
      partnerLocked: true,
    };
  }

  let orgId = requestedOrgId;
  if (!orgId) {
    const resolved = await resolveOrgIdForAdmin(prisma, adminId, user, undefined);
    if ('requiresSelection' in resolved) {
      return {
        requiresOrgSelection: true,
        memberships: resolved.memberships,
      };
    }
    orgId = resolved.orgId;
  } else {
    const allowed = await resolveOrgIdForAdmin(prisma, adminId, user, orgId);
    if ('requiresSelection' in allowed) {
      throw Object.assign(new Error('You do not have access to this organization.'), {
        status: 403,
        code: 'FORBIDDEN_ORG',
      });
    }
    orgId = allowed.orgId;
  }

  const [resellers, memberships] = await Promise.all([
    loadResellerPicker(prisma, orgId),
    loadOrgMembershipsForAdmin(prisma, adminId, user!),
  ]);

  if (requestedResellerId) {
    const reseller = resellers.find((r) => r.id === requestedResellerId);
    if (!reseller) {
      throw Object.assign(new Error('Partner not found for this organization.'), {
        status: 404,
        code: 'NOT_FOUND',
      });
    }
    return {
      orgId,
      resellerId: requestedResellerId,
      mode: 'preview',
      partnerLocked: false,
      resellers,
      memberships,
    };
  }

  return {
    orgId,
    resellerId: null,
    mode: 'preview',
    partnerLocked: false,
    resellers,
    memberships,
  };
}

function buildListWhere(
  orgId: string,
  resellerId: string | null,
  query: AuthenticatedRequest['query'],
  allowedStationIds: string[] | null = null
): Prisma.CredentialWhereInput {
  const where: Prisma.CredentialWhereInput = {
    orgId,
    deletedAt: null,
    type: 'VOUCHER_TOKEN',
  };

  if (resellerId) {
    where.resellerId = resellerId;
  }

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
  const planId = typeof query.planId === 'string' ? query.planId.trim() : '';
  const stationId = typeof query.stationId === 'string' ? query.stationId.trim() : '';

  if (status && (CREDENTIAL_STATUSES as readonly string[]).includes(status)) {
    where.status = status as CredentialStatus;
  }
  if (planId) where.planId = planId;
  if (stationId) {
    where.stationId =
      allowedStationIds && !allowedStationIds.includes(stationId)
        ? { in: [] }
        : stationId;
  } else if (allowedStationIds) {
    where.stationId = { in: allowedStationIds };
  }

  if (search) {
    where.OR = [
      { token: { contains: search, mode: 'insensitive' } },
      { plan: { code: { contains: search, mode: 'insensitive' } } },
      { plan: { name: { contains: search, mode: 'insensitive' } } },
      { station: { code: { contains: search, mode: 'insensitive' } } },
      { station: { name: { contains: search, mode: 'insensitive' } } },
      { reseller: { code: { contains: search, mode: 'insensitive' } } },
      { reseller: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

/** menus.wifi.commerce.access-tokens @route /wifi/commerce/access-tokens */
export class CommerceAccessTokensController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);
      const q = queryResellerParams(req.query);

      if (req.query.formOptions === 'true') {
        try {
          const scope = await resolveAccessTokensListScope(this.prisma, adminId, req.user, q);
          if ('requiresOrgSelection' in scope) {
            return responseSuccess(res, {
              message: 'Success',
              data: { memberships: scope.memberships, resellers: [], catalog: null },
              meta: {
                requiresOrgSelection: true,
                memberships: scope.memberships,
                partnerLocked: false,
              },
            });
          }

          const allowedStationIds = await resolveAllowedStationIds(
            this.prisma,
            adminId,
            scope.orgId,
            req.user!
          );
          const catalog = scope.resellerId
            ? await loadSellableCatalog(
                this.prisma,
                scope.orgId,
                scope.resellerId,
                allowedStationIds
              )
            : await loadOrgFilterCatalog(this.prisma, scope.orgId, allowedStationIds);

          const memberships =
            scope.memberships ??
            (await loadOrgMembershipsForAdmin(this.prisma, adminId, req.user!));
          const resellers = allowedStationIds
            ? await loadResellerPicker(this.prisma, scope.orgId, allowedStationIds)
            : (scope.resellers ?? (await loadResellerPicker(this.prisma, scope.orgId)));

          return responseSuccess(res, {
            message: 'Success',
            data: { memberships, resellers, catalog },
            meta: {
              mode: scope.mode,
              orgId: scope.orgId,
              resellerId: scope.resellerId,
              partnerLocked: scope.partnerLocked,
              requiresOrgSelection: false,
              requiresResellerSelection: false,
            },
          });
        } catch (err: unknown) {
          const status =
            err && typeof err === 'object' && 'status' in err
              ? Number((err as { status: number }).status)
              : 400;
          const code =
            err && typeof err === 'object' && 'code' in err
              ? String((err as { code: string }).code)
              : 'ACCESS_TOKENS_ERROR';
          const message = err instanceof Error ? err.message : 'Failed to load form options.';
          return responseError(res, status, { code, message });
        }
      }

      try {
        const scope = await resolveAccessTokensListScope(this.prisma, adminId, req.user, q);

        if ('requiresOrgSelection' in scope) {
          return responseSuccess(res, {
            message: 'Success',
            data: [],
            meta: {
              requiresOrgSelection: true,
              memberships: scope.memberships,
              partnerLocked: false,
            },
          });
        }

        const { orgId, resellerId, mode, partnerLocked } = scope;
        const permissionCtx: CredentialPermissionContext = { mode, isDeveloper };
        const revokeWindowMinutes = await loadAccessTokenRevokeWindowMinutes(this.prisma);
        const allowedStationIds = await resolveAllowedStationIds(
          this.prisma,
          adminId,
          orgId,
          req.user!
        );

        if (!isUndefinedOrUndefinedString(req.params?.id)) {
          const idParam = req.params.id as string | string[];
          const id = Array.isArray(idParam) ? idParam[0] : idParam;

          const row = await this.prisma.credential.findFirst({
            where: {
              id,
              orgId,
              deletedAt: null,
              ...(resellerId ? { resellerId } : {}),
              ...(allowedStationIds ? { stationId: { in: allowedStationIds } } : {}),
            },
            select: credentialSelect,
          });

          if (!row) {
            return responseError(res, 404, {
              code: 'NOT_FOUND',
              message: 'Access token not found.',
            });
          }

          const sessions = await loadTokenSessionHistory(this.prisma, orgId, {
            id: row.id,
            username: row.username,
            token: row.token,
            status: row.status,
            activatedAt: row.activatedAt,
          });
          const firstLoginMap = await loadFirstLoginAtMap(this.prisma, orgId, [row]);

          return responseSuccess(res, {
            message: 'Success',
            data: {
              ...serializeCredential(
                row,
                permissionCtx,
                revokeWindowMinutes,
                firstLoginMap.get(row.id) ?? null
              ),
              ...sessions,
            },
          });
        }

        const where = buildListWhere(orgId, resellerId, req.query, allowedStationIds);
        const { page, limit, skip, take } = parsePagination(req.query);
        const todayStart = startOfUtcDay();
        const saleWhere = {
          orgId,
          ...(resellerId ? { resellerId } : {}),
          ...(allowedStationIds ? { stationId: { in: allowedStationIds } } : {}),
          soldAt: { gte: todayStart },
          status: 'PAID' as const,
        };
        const statusWhere: Prisma.CredentialWhereInput = {
          orgId,
          deletedAt: null,
          type: 'VOUCHER_TOKEN',
          ...(resellerId ? { resellerId } : {}),
          ...(allowedStationIds ? { stationId: { in: allowedStationIds } } : {}),
        };

        const [
          rows,
          total,
          statusGroups,
          todayOrders,
          todayRevenue,
          catalog,
          memberships,
          resellers,
        ] = await Promise.all([
          this.prisma.credential.findMany({
            where,
            select: credentialSelect,
            orderBy: [{ createdAt: 'desc' }],
            skip,
            take,
          }),
          this.prisma.credential.count({ where }),
          this.prisma.credential.groupBy({
            by: ['status'],
            where: statusWhere,
            _count: { _all: true },
          }),
          this.prisma.saleOrder.count({ where: saleWhere }),
          this.prisma.saleOrder.aggregate({
            where: saleWhere,
            _sum: { total: true },
          }),
          resellerId
            ? loadSellableCatalog(this.prisma, orgId, resellerId, allowedStationIds)
            : loadOrgFilterCatalog(this.prisma, orgId, allowedStationIds),
          scope.memberships ??
            (mode === 'preview'
              ? loadOrgMembershipsForAdmin(this.prisma, adminId, req.user!)
              : Promise.resolve(undefined)),
          allowedStationIds
            ? loadResellerPicker(this.prisma, orgId, allowedStationIds)
            : scope.resellers ??
              (mode === 'preview'
                ? loadResellerPicker(this.prisma, orgId)
                : Promise.resolve(undefined)),
        ]);

        const statusCounts = Object.fromEntries(
          statusGroups.map((g) => [g.status, g._count._all])
        );

        const firstLoginMap = await loadFirstLoginAtMap(this.prisma, orgId, rows);

        responseSuccess(res, {
          message: 'Success',
          data: rows.map((row) =>
            serializeCredential(
              row,
              permissionCtx,
              revokeWindowMinutes,
              firstLoginMap.get(row.id) ?? null
            )
          ),
          meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            mode,
            orgId,
            resellerId,
            partnerLocked,
            revokeWindowMinutes,
            statusCounts,
            todayOrders,
            todayRevenue: decimalToNumber(todayRevenue._sum.total),
            catalog,
            memberships,
            resellers,
          },
        });
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'ACCESS_TOKENS_ERROR';
        const message = err instanceof Error ? err.message : 'Failed to load access tokens.';
        return responseError(res, status, { code, message });
      }
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const recordId = (req.params?.id as string) ?? null;
      const isRevoke = Boolean(recordId && recordId !== 'all');

      const q = queryResellerParams(req.query);

      try {
        const context = await resolveResellerContext(this.prisma, adminId, req.user, q);

        if ('requiresOrgSelection' in context || 'requiresResellerSelection' in context) {
          return responseError(res, 400, {
            code: 'RESELLER_REQUIRED',
            message: 'Select a partner context before issuing tokens.',
          });
        }

        const { orgId, resellerId, mode } = context;
        const isDeveloper = isDeveloperAdmin(req.user!);
        const revokeWindowMinutes = await loadAccessTokenRevokeWindowMinutes(this.prisma);
        const elevated = isDeveloper || mode === 'preview';

        if (isRevoke) {
          const existing = await this.prisma.credential.findFirst({
            where: { id: recordId!, orgId, resellerId, deletedAt: null },
            select: { status: true, soldAt: true },
          });
          if (!existing) {
            return responseError(res, 404, { code: 'NOT_FOUND', message: 'Access token not found.' });
          }
          const actions = resolveCredentialActions(
            { mode, isDeveloper },
            existing,
            revokeWindowMinutes
          );
          assertCredentialActionAllowed(actions, 'revoke');

          const result = await this.prisma.$transaction((tx) =>
            revokeAccessToken(
              tx,
              { orgId, resellerId, credentialId: recordId! },
              {
                elevated,
                enforceRevokeWindow: !elevated,
                revokeWindowMinutes,
              }
            )
          );

          return responseSuccess(res, {
            message: revokeSuccessMessage(result),
            data: result,
          });
        }

        const { error, value } = CommerceAccessTokensIssueSchema.validate(req.body, {
          abortEarly: false,
          allowUnknown: false,
        });

        if (error) {
          return responseError(res, 400, {
            code: 'VALIDATION_ERROR',
            message: error.details.map((d) => d.message).join(', '),
          });
        }

        const reseller = await this.prisma.reseller.findFirst({
          where: { id: resellerId, orgId, deletedAt: null, status: 'ACTIVE' },
          select: { id: true, code: true },
        });

        if (!reseller) {
          return responseError(res, 403, {
            code: 'RESELLER_INACTIVE',
            message: 'Partner account is not active.',
          });
        }

        const stationMapped = await this.prisma.resellerStation.findFirst({
          where: {
            orgId,
            resellerId,
            stationId: value.stationId,
            deletedAt: null,
            station: { deletedAt: null, status: { not: 'DISABLED' } },
          },
          select: { id: true },
        });

        const allowedStationIds = await resolveAllowedStationIds(
          this.prisma,
          adminId,
          orgId,
          req.user!
        );
        if (allowedStationIds && !allowedStationIds.includes(value.stationId)) {
          return responseError(res, 403, {
            code: 'SITE_NOT_ALLOWED',
            message: 'This site is not on your allow-list.',
          });
        }

        if (!stationMapped) {
          return responseError(res, 400, {
            code: 'STATION_NOT_MAPPED',
            message: 'Selected site is not mapped to this partner.',
          });
        }

        const entitled = await this.prisma.resellerPlanEntitlement.findFirst({
          where: {
            resellerId,
            planId: value.planId,
            isEnabled: true,
            plan: { orgId, deletedAt: null, isActive: true },
          },
          select: { id: true },
        });

        if (!entitled) {
          return responseError(res, 400, {
            code: 'PLAN_NOT_ENTITLED',
            message: 'This plan is not enabled for this partner.',
          });
        }

        const priceResult = await resolveRetailPrice(
          this.prisma,
          orgId,
          resellerId,
          value.stationId,
          value.planId
        );

        if (!priceResult) {
          return responseError(res, 400, {
            code: 'NO_PRICE',
            message: 'No retail price is configured for this plan at this site.',
          });
        }

        const unitPrice = priceResult.price;
        const quantity = value.quantity as number;
        const lineSubtotal = unitPrice.mul(quantity);
        const discount = new Prisma.Decimal(value.discount ?? 0);
        const total = Prisma.Decimal.max(new Prisma.Decimal(0), lineSubtotal.sub(discount));

        const org = await this.prisma.org.findUnique({
          where: { id: orgId },
          select: { currency: true },
        });

        const orderNo = generateOrderNo();
        const soldAt = new Date();

        const availableSlots = await countAvailableVoucherSlots(
          this.prisma,
          orgId,
          value.planId,
          value.stationId
        );
        if (availableSlots < quantity) {
          return responseError(res, 409, {
            code: 'INSUFFICIENT_VOUCHER_INVENTORY',
            message: formatInsufficientVoucherInventoryMessage(availableSlots, quantity),
          });
        }

        const result = await this.prisma.$transaction(
          async (tx) => {
          const batchIds = await reserveVoucherBatchSlots(
            tx,
            orgId,
            value.planId,
            value.stationId,
            quantity
          );

          const order = await tx.saleOrder.create({
            data: {
              orgId,
              orderNo,
              status: 'PAID',
              resellerId,
              stationId: value.stationId,
              subtotal: lineSubtotal,
              discount,
              total,
              currency: org?.currency ?? 'MMK',
              note: value.note || null,
              soldAt,
            },
            select: { id: true, orderNo: true, total: true, currency: true },
          });

          await tx.payment.create({
            data: {
              orgId,
              orderId: order.id,
              method: value.paymentMethod,
              amount: total,
              paidAt: soldAt,
              note: value.note || null,
            },
          });

          const credentials: CredentialRow[] = [];

          for (let i = 0; i < quantity; i += 1) {
            const token = await generateUniqueAlphanumericToken(tx);
            const voucherBatchId = batchIds[i]!;

            const credential = await tx.credential.create({
              data: {
                orgId,
                type: 'VOUCHER_TOKEN',
                status: 'SOLD',
                planId: value.planId,
                token,
                stationId: value.stationId,
                resellerId,
                voucherBatchId,
                soldAt,
              },
              select: credentialSelect,
            });

            await tx.saleItem.create({
              data: {
                orgId,
                orderId: order.id,
                planId: value.planId,
                credentialId: credential.id,
                qty: 1,
                unitPrice,
                lineTotal: unitPrice,
              },
            });

            credentials.push(credential);
          }

          return { order, credentials };
          },
          // Remote DO PG: each token does uniqueness check + creates; default 5s is too tight.
          { maxWait: 15_000, timeout: 60_000 },
        );

        return responseSuccess(res, {
          status: 201,
          message:
            result.credentials.length === 1
              ? 'Access token issued'
              : `${result.credentials.length} access tokens issued`,
          data: {
            order: {
              ...result.order,
              total: decimalToNumber(result.order.total),
            },
            credentials: result.credentials.map((row) =>
              serializeCredential(
                row,
                { mode, isDeveloper: isDeveloperAdmin(req.user!) },
                revokeWindowMinutes
              )
            ),
          },
        });
      } catch (err: unknown) {
        if (err instanceof InsufficientVoucherInventoryError) {
          return responseError(res, err.status, { code: err.code, message: err.message });
        }
        const rawMessage = err instanceof Error ? err.message : '';
        if (/expired transaction|transaction.*timeout|interactive transaction/i.test(rawMessage)) {
          return responseError(res, 503, {
            code: 'ISSUE_TIMEOUT',
            message:
              'Issuing tokens took too long (slow database). Please try again with a smaller quantity.',
          });
        }
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'ISSUE_FAILED';
        const message = err instanceof Error ? err.message : 'Failed to issue access token.';
        return responseError(res, status, { code, message });
      }
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const idParam = req.params.id as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      const q = queryResellerParams(req.query);

      try {
        const context = await resolveResellerContext(this.prisma, adminId, req.user, q);

        if ('requiresOrgSelection' in context || 'requiresResellerSelection' in context) {
          return responseError(res, 400, {
            code: 'RESELLER_REQUIRED',
            message: 'Select a partner context before revoking tokens.',
          });
        }

        const { orgId, resellerId, mode } = context;
        const isDeveloper = isDeveloperAdmin(req.user!);
        const revokeWindowMinutes = await loadAccessTokenRevokeWindowMinutes(this.prisma);
        const elevated = isDeveloper || mode === 'preview';

        const existing = await this.prisma.credential.findFirst({
          where: { id, orgId, resellerId, deletedAt: null },
          select: { status: true, soldAt: true },
        });
        if (!existing) {
          return responseError(res, 404, { code: 'NOT_FOUND', message: 'Access token not found.' });
        }
        const actions = resolveCredentialActions(
          { mode, isDeveloper },
          existing,
          revokeWindowMinutes
        );
        assertCredentialActionAllowed(actions, 'revoke');

        const result = await this.prisma.$transaction((tx) =>
          revokeAccessToken(
            tx,
            { orgId, resellerId, credentialId: id },
            {
              elevated,
              enforceRevokeWindow: !elevated,
              revokeWindowMinutes,
            }
          )
        );

        responseSuccess(res, {
          message: revokeSuccessMessage(result),
          data: result,
        });
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'REVOKE_FAILED';
        const message = err instanceof Error ? err.message : 'Failed to revoke access token.';
        return responseError(res, status, { code, message });
      }
    }),
  ];

  public applyAction = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const idParam = req.params.id as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;
      const q = queryResellerParams(req.query);

      const { error, value } = CommerceAccessTokensActionSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });
      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      try {
        const context = await resolveResellerContext(this.prisma, adminId, req.user, q);

        if ('requiresOrgSelection' in context) {
          return responseError(res, 400, {
            code: 'RESELLER_REQUIRED',
            message: 'Select an organization before changing token status.',
          });
        }

        const isDeveloper = isDeveloperAdmin(req.user!);
        const revokeWindowMinutes = await loadAccessTokenRevokeWindowMinutes(this.prisma);

        let orgId: string;
        let resellerId: string;
        let mode: 'partner' | 'preview';
        let existing: { status: string; soldAt: Date | null };

        if ('requiresResellerSelection' in context) {
          // Admin preview with "all partners" list: use the token's own partner.
          const credential = await this.prisma.credential.findFirst({
            where: { id, orgId: context.orgId, deletedAt: null },
            select: { status: true, soldAt: true, resellerId: true },
          });
          if (!credential?.resellerId) {
            return responseError(res, 404, {
              code: 'NOT_FOUND',
              message: 'Access token not found.',
            });
          }
          orgId = context.orgId;
          resellerId = credential.resellerId;
          mode = 'preview';
          existing = { status: credential.status, soldAt: credential.soldAt };
        } else {
          orgId = context.orgId;
          resellerId = context.resellerId;
          mode = context.mode;
          const row = await this.prisma.credential.findFirst({
            where: { id, orgId, resellerId, deletedAt: null },
            select: { status: true, soldAt: true },
          });
          if (!row) {
            return responseError(res, 404, {
              code: 'NOT_FOUND',
              message: 'Access token not found.',
            });
          }
          existing = row;
        }

        const actions = resolveCredentialActions(
          { mode, isDeveloper },
          existing,
          revokeWindowMinutes
        );
        assertCredentialActionAllowed(actions, value.action);

        await this.prisma.$transaction(async (tx) => {
          const params = { orgId, resellerId, credentialId: id };
          if (value.action === 'pause') {
            await pauseAccessToken(tx, params);
          } else if (value.action === 'unlock') {
            await unlockAccessToken(tx, params);
          } else if (value.action === 'allowNewDevice') {
            await allowNewDeviceAccessToken(tx, params);
          } else {
            await revertAccessTokenToSold(tx, params);
          }
        });

        const row = await this.prisma.credential.findFirst({
          where: { id, orgId, deletedAt: null },
          select: credentialSelect,
        });

        const actionLabels: Record<string, string> = {
          pause: 'paused',
          unlock: 'unlocked',
          allowNewDevice: 'ready for a new device',
          revertToSold: 'reverted to sold',
        };

        responseSuccess(res, {
          message:
            value.action === 'allowNewDevice'
              ? 'Device binding cleared. The customer can log in from a new device now.'
              : `Access token ${actionLabels[value.action] ?? 'updated'}`,
          data: row
            ? serializeCredential(row, { mode, isDeveloper }, revokeWindowMinutes)
            : null,
        });
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : 400;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'ACTION_FAILED';
        const message = err instanceof Error ? err.message : 'Failed to update access token.';
        return responseError(res, status, { code, message });
      }
    }),
  ];
}
