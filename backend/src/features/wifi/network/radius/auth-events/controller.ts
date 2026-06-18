import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
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

const eventSelect = {
  id: true,
  username: true,
  reply: true,
  calledStationId: true,
  callingStationId: true,
  authdate: true,
  class: true,
} satisfies Prisma.RadpostauthSelect;

type EventRow = Prisma.RadpostauthGetPayload<{ select: typeof eventSelect }>;

export type AuthEventOutcome = 'ACCEPT' | 'REJECT' | 'UNKNOWN';

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

function deriveOutcome(reply: string | null, classVal: string | null): AuthEventOutcome {
  const text = `${reply ?? ''} ${classVal ?? ''}`.toLowerCase();
  if (text.includes('reject')) return 'REJECT';
  if (text.includes('accept')) return 'ACCEPT';
  return 'UNKNOWN';
}

function outcomeWhere(outcome: string): Prisma.RadpostauthWhereInput | null {
  const normalized = outcome.trim().toUpperCase();
  if (normalized === 'ACCEPT') {
    return {
      OR: [
        { reply: { contains: 'Accept', mode: 'insensitive' } },
        { class: { contains: 'Accept', mode: 'insensitive' } },
      ],
    };
  }
  if (normalized === 'REJECT') {
    return {
      OR: [
        { reply: { contains: 'Reject', mode: 'insensitive' } },
        { class: { contains: 'Reject', mode: 'insensitive' } },
      ],
    };
  }
  return null;
}

async function orgUsernameFilter(
  prisma: PrismaClient,
  orgId: string
): Promise<Prisma.RadpostauthWhereInput> {
  const credentials = await prisma.credential.findMany({
    where: { orgId, deletedAt: null },
    select: { username: true, token: true },
  });

  const usernames = [
    ...new Set(
      credentials
        .flatMap((row) => [row.username, row.token])
        .filter((value): value is string => Boolean(value?.trim()))
    ),
  ];

  if (usernames.length === 0) {
    return { username: '__no_match__' };
  }

  return { username: { in: usernames } };
}

function buildListWhere(
  query: AuthenticatedRequest['query'],
  orgScope?: Prisma.RadpostauthWhereInput
): Prisma.RadpostauthWhereInput {
  const where: Prisma.RadpostauthWhereInput = { ...(orgScope ?? {}) };
  const outcome = typeof query.outcome === 'string' ? query.outcome.trim() : '';
  const view = typeof query.view === 'string' ? query.view.trim().toLowerCase() : 'recent';
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const authFrom = parseDate(query.authFrom);
  const authTo = parseDate(query.authTo);

  if (view === 'recent') {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    where.authdate = { gte: since };
  } else if (view === 'today') {
    where.authdate = { gte: startOfToday() };
  }

  if (authFrom || authTo) {
    where.authdate = {
      ...(typeof where.authdate === 'object' && where.authdate !== null ? where.authdate : {}),
      ...(authFrom && { gte: authFrom }),
      ...(authTo && { lte: authTo }),
    };
  }

  const outcomeFilter = outcome ? outcomeWhere(outcome) : null;
  if (outcomeFilter) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), outcomeFilter];
  }

  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { callingStationId: { contains: search, mode: 'insensitive' } },
      { calledStationId: { contains: search, mode: 'insensitive' } },
      { reply: { contains: search, mode: 'insensitive' } },
      { class: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

function serializeEvent(row: EventRow) {
  return {
    ...row,
    id: row.id.toString(),
    outcome: deriveOutcome(row.reply, row.class),
  };
}

/** menus.wifi.network.radius.auth-events @route /wifi/network/radius/auth-events */
export class NetworkRadiusAuthEventsController {
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
            data: { orgs: scope.memberships },
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
        return responseSuccess(res, {
          message: 'Success',
          data: { orgs: scopedNetworkFormOrgs(scope) },
          meta: toNetworkOrgMeta(scope),
        });
      }

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const idParam = req.params.id as string | string[];
        const idRaw = Array.isArray(idParam) ? idParam[0] : idParam;
        let id: bigint;
        try {
          id = BigInt(idRaw);
        } catch {
          return responseError(res, 400, {
            code: 'INVALID_ID',
            message: 'Invalid auth event id.',
          });
        }

        const orgScope = await orgUsernameFilter(this.prisma, orgId);
        const row = await this.prisma.radpostauth.findFirst({
          where: { id, ...orgScope },
          select: eventSelect,
        });

        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Auth event not found.',
          });
        }

        return responseSuccess(res, {
          message: 'Success',
          data: serializeEvent(row),
          meta: toNetworkOrgMeta(scope),
        });
      }

      const orgScope = await orgUsernameFilter(this.prisma, orgId);
      const view = typeof req.query.view === 'string' ? req.query.view.trim().toLowerCase() : 'recent';
      const where = buildListWhere(req.query, orgScope);
      const { page, limit, skip, take } = parsePagination(req.query);
      const todayStart = startOfToday();
      const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const acceptTodayWhere: Prisma.RadpostauthWhereInput = {
        ...(orgScope ?? {}),
        authdate: { gte: todayStart },
        ...outcomeWhere('ACCEPT')!,
      };

      const rejectTodayWhere: Prisma.RadpostauthWhereInput = {
        ...(orgScope ?? {}),
        authdate: { gte: todayStart },
        ...outcomeWhere('REJECT')!,
      };

      const [rows, total, acceptToday, rejectToday, recentCount] = await Promise.all([
        this.prisma.radpostauth.findMany({
          where,
          select: eventSelect,
          orderBy: { authdate: 'desc' },
          skip,
          take,
        }),
        this.prisma.radpostauth.count({ where }),
        this.prisma.radpostauth.count({ where: acceptTodayWhere }),
        this.prisma.radpostauth.count({ where: rejectTodayWhere }),
        this.prisma.radpostauth.count({
          where: {
            ...(orgScope ?? {}),
            authdate: { gte: recentSince },
          },
        }),
      ]);

      responseSuccess(res, {
        message: 'Success',
        data: rows.map(serializeEvent),
        meta: mergeNetworkOrgMeta(scope, {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          view,
          acceptToday,
          rejectToday,
          recentCount,
        }),
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'READ_ONLY',
        message: 'Post-authentication events are written by FreeRADIUS and cannot be modified from the console.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'READ_ONLY',
        message: 'Post-authentication events cannot be deleted from the console.',
      });
    }),
  ];
}
