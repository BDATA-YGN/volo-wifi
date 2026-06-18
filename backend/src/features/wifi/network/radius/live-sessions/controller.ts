import { Response } from 'express';
import { Prisma, RadiusAcctStatus } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import {
  mergeNetworkOrgMeta,
  resolveNetworkOrgScope,
  scopedNetworkFormOrgs,
  toNetworkOrgMeta,
} from '@/features/wifi/network/shared/resolve-network-org';

const orgSelect = {
  id: true,
  code: true,
  name: true,
  isActive: true,
} satisfies Prisma.OrgSelect;

const stationSelect = {
  id: true,
  code: true,
  name: true,
  status: true,
} satisfies Prisma.WifiStationSelect;

const credentialSelect = {
  id: true,
  type: true,
  status: true,
  token: true,
  username: true,
} satisfies Prisma.CredentialSelect;

const sessionSelect = {
  id: true,
  orgId: true,
  stationId: true,
  credentialId: true,
  acctSessionId: true,
  userName: true,
  callingStationId: true,
  framedIpAddress: true,
  nasIpAddress: true,
  nasIdentifier: true,
  status: true,
  startedAt: true,
  lastInterimAt: true,
  stoppedAt: true,
  inputBytes: true,
  outputBytes: true,
  totalBytes: true,
  sessionTimeSec: true,
  terminateCause: true,
  createdAt: true,
  updatedAt: true,
  org: { select: orgSelect },
  station: { select: stationSelect },
  credential: { select: credentialSelect },
} satisfies Prisma.RadiusSessionSelect;

type SessionRow = Prisma.RadiusSessionGetPayload<{ select: typeof sessionSelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function baseScopeWhere(
  query: AuthenticatedRequest['query'],
  orgId: string
): Prisma.RadiusSessionWhereInput {
  const stationId = typeof query.stationId === 'string' ? query.stationId.trim() : '';

  const where: Prisma.RadiusSessionWhereInput = { orgId };
  if (stationId) where.stationId = stationId;
  return where;
}

function buildListWhere(
  query: AuthenticatedRequest['query'],
  orgId: string
): Prisma.RadiusSessionWhereInput {
  const where = baseScopeWhere(query, orgId);
  const status = typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
  const view = typeof query.view === 'string' ? query.view.trim().toLowerCase() : 'active';
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const startedFrom = parseDate(query.startedFrom);
  const startedTo = parseDate(query.startedTo);

  if (status && ['START', 'INTERIM', 'STOP'].includes(status)) {
    where.status = status as RadiusAcctStatus;
  } else if (view === 'active') {
    where.status = { in: ['START', 'INTERIM'] };
    where.stoppedAt = null;
  } else if (view === 'recent') {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    where.status = 'STOP';
    where.stoppedAt = { gte: since };
  }

  if (startedFrom || startedTo) {
    where.startedAt = {
      ...(startedFrom && { gte: startedFrom }),
      ...(startedTo && { lte: startedTo }),
    };
  }

  if (search) {
    where.OR = [
      { userName: { contains: search, mode: 'insensitive' } },
      { callingStationId: { contains: search, mode: 'insensitive' } },
      { framedIpAddress: { contains: search, mode: 'insensitive' } },
      { acctSessionId: { contains: search, mode: 'insensitive' } },
      { nasIpAddress: { contains: search, mode: 'insensitive' } },
      { nasIdentifier: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

function serializeSession(row: SessionRow | (Omit<SessionRow, 'org' | 'station' | 'credential'> & {
  org?: SessionRow['org'];
  station?: SessionRow['station'];
  credential?: SessionRow['credential'];
})) {
  return {
    ...row,
    inputBytes: row.inputBytes != null ? row.inputBytes.toString() : null,
    outputBytes: row.outputBytes != null ? row.outputBytes.toString() : null,
    totalBytes: row.totalBytes != null ? row.totalBytes.toString() : null,
  };
}

function listOrderBy(
  view: string
): Prisma.RadiusSessionOrderByWithRelationInput[] {
  if (view === 'recent') {
    return [{ stoppedAt: 'desc' }, { startedAt: 'desc' }];
  }
  if (view === 'active') {
    return [{ lastInterimAt: 'desc' }, { startedAt: 'desc' }];
  }
  return [{ startedAt: 'desc' }];
}

/** menus.wifi.network.radius.live-sessions @route /wifi/network/radius/live-sessions */
export class NetworkRadiusLiveSessionsController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);

      if ('requiresOrgSelection' in scope) {
        if (req.query.formOptions === 'true') {
          return responseSuccess(res, {
            message: 'Success',
            data: { orgs: scope.memberships, stations: [] },
            meta: toNetworkOrgMeta(scope),
          });
        }

        const { page, limit } = parsePagination(req.query);
        return responseSuccess(res, {
          message: 'Success',
          data: [],
          meta: mergeNetworkOrgMeta(scope, {
            page,
            limit,
            total: 0,
            totalPages: 1,
          }),
        });
      }

      const { orgId } = scope;

      if (req.query.formOptions === 'true') {
        const stations = await this.prisma.wifiStation.findMany({
          where: { orgId, deletedAt: null },
          select: stationSelect,
          orderBy: { name: 'asc' },
        });

        return responseSuccess(res, {
          message: 'Success',
          data: { orgs: scopedNetworkFormOrgs(scope), stations },
          meta: toNetworkOrgMeta(scope),
        });
      }

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const idParam = req.params.id as string | string[];
        const id = Array.isArray(idParam) ? idParam[0] : idParam;
        const row = await this.prisma.radiusSession.findFirst({
          where: { id, orgId },
          select: sessionSelect,
        });

        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'RADIUS session not found.',
          });
        }

        return responseSuccess(res, {
          message: 'Success',
          data: serializeSession(row),
          meta: toNetworkOrgMeta(scope),
        });
      }

      const view = typeof req.query.view === 'string' ? req.query.view.trim().toLowerCase() : 'active';
      const where = buildListWhere(req.query, orgId);
      const scopeWhere = baseScopeWhere(req.query, orgId);
      const { page, limit, skip, take } = parsePagination(req.query);
      const todayStart = startOfToday();
      const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const activeWhere: Prisma.RadiusSessionWhereInput = {
        ...scopeWhere,
        status: { in: ['START', 'INTERIM'] },
        stoppedAt: null,
      };

      const [
        rows,
        total,
        activeCount,
        interimCount,
        stoppedToday,
        stoppedRecent,
        activeBytesAgg,
      ] = await Promise.all([
        this.prisma.radiusSession.findMany({
          where,
          select: sessionSelect,
          orderBy: listOrderBy(view),
          skip,
          take,
        }),
        this.prisma.radiusSession.count({ where }),
        this.prisma.radiusSession.count({ where: activeWhere }),
        this.prisma.radiusSession.count({
          where: { ...scopeWhere, status: 'INTERIM', stoppedAt: null },
        }),
        this.prisma.radiusSession.count({
          where: {
            ...scopeWhere,
            status: 'STOP',
            stoppedAt: { gte: todayStart },
          },
        }),
        this.prisma.radiusSession.count({
          where: {
            ...scopeWhere,
            status: 'STOP',
            stoppedAt: { gte: recentSince },
          },
        }),
        this.prisma.radiusSession.aggregate({
          where: activeWhere,
          _sum: { totalBytes: true, inputBytes: true, outputBytes: true },
        }),
      ]);

      responseSuccess(res, {
        message: 'Success',
        data: rows.map(serializeSession),
        meta: mergeNetworkOrgMeta(scope, {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          view,
          activeCount,
          interimCount,
          stoppedToday,
          stoppedRecent,
          activeTotalBytes: activeBytesAgg._sum.totalBytes?.toString() ?? '0',
          activeInputBytes: activeBytesAgg._sum.inputBytes?.toString() ?? '0',
          activeOutputBytes: activeBytesAgg._sum.outputBytes?.toString() ?? '0',
        }),
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'READ_ONLY',
        message: 'RADIUS sessions are accounting records and cannot be created or updated from the console.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'READ_ONLY',
        message: 'RADIUS sessions cannot be deleted from the console.',
      });
    }),
  ];
}
