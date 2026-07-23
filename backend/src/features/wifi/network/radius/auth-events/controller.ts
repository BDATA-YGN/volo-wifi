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

type EventRow = {
  id: bigint;
  username: string;
  reply: string | null;
  calledStationId: string | null;
  callingStationId: string | null;
  authdate: Date;
  class: string | null;
};

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

function serializeEvent(row: EventRow) {
  return {
    id: row.id.toString(),
    username: row.username,
    reply: row.reply,
    calledStationId: row.calledStationId,
    callingStationId: row.callingStationId,
    authdate: row.authdate,
    class: row.class,
    outcome: deriveOutcome(row.reply, row.class),
  };
}

/** Match radpostauth usernames to org credentials without a giant Prisma `IN (...)` list. */
function orgCredentialMatchSql(orgId: string): Prisma.Sql {
  return Prisma.sql`(
    r.username IN (
      SELECT c.username
      FROM wf_credential c
      WHERE c.org_id = ${orgId}
        AND c.deleted_at IS NULL
        AND c.username IS NOT NULL
        AND btrim(c.username) <> ''
    )
    OR r.username IN (
      SELECT c.token
      FROM wf_credential c
      WHERE c.org_id = ${orgId}
        AND c.deleted_at IS NULL
        AND c.token IS NOT NULL
        AND btrim(c.token) <> ''
    )
  )`;
}

function outcomeSql(outcome: string): Prisma.Sql | null {
  const normalized = outcome.trim().toUpperCase();
  if (normalized === 'ACCEPT') {
    return Prisma.sql`(
      r.reply ILIKE ${'%Accept%'}
      OR r.class ILIKE ${'%Accept%'}
    )`;
  }
  if (normalized === 'REJECT') {
    return Prisma.sql`(
      r.reply ILIKE ${'%Reject%'}
      OR r.class ILIKE ${'%Reject%'}
    )`;
  }
  return null;
}

function buildFilterSql(
  orgId: string,
  query: AuthenticatedRequest['query'],
  opts?: { ignoreView?: boolean }
): Prisma.Sql {
  const parts: Prisma.Sql[] = [orgCredentialMatchSql(orgId)];

  const outcome = typeof query.outcome === 'string' ? query.outcome.trim() : '';
  const view = typeof query.view === 'string' ? query.view.trim().toLowerCase() : 'recent';
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const authFrom = parseDate(query.authFrom);
  const authTo = parseDate(query.authTo);

  if (!opts?.ignoreView) {
    if (view === 'recent') {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      parts.push(Prisma.sql`r.authdate >= ${since}`);
    } else if (view === 'today') {
      parts.push(Prisma.sql`r.authdate >= ${startOfToday()}`);
    }
  }

  if (authFrom) parts.push(Prisma.sql`r.authdate >= ${authFrom}`);
  if (authTo) parts.push(Prisma.sql`r.authdate <= ${authTo}`);

  const outcomePart = outcome ? outcomeSql(outcome) : null;
  if (outcomePart) parts.push(outcomePart);

  if (search) {
    const like = `%${search}%`;
    parts.push(Prisma.sql`(
      r.username ILIKE ${like}
      OR r.callingstationid ILIKE ${like}
      OR r.calledstationid ILIKE ${like}
      OR r.reply ILIKE ${like}
      OR r.class ILIKE ${like}
    )`);
  }

  return Prisma.join(parts, ' AND ');
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

        const rows = await this.prisma.$queryRaw<EventRow[]>`
          SELECT
            r.id,
            r.username,
            r.reply,
            r.calledstationid AS "calledStationId",
            r.callingstationid AS "callingStationId",
            r.authdate,
            r.class
          FROM radpostauth r
          WHERE r.id = ${id}
            AND ${orgCredentialMatchSql(orgId)}
          LIMIT 1
        `;

        const row = rows[0];
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

      const view =
        typeof req.query.view === 'string' ? req.query.view.trim().toLowerCase() : 'recent';
      const { page, limit, skip, take } = parsePagination(req.query);
      const filterSql = buildFilterSql(orgId, req.query);
      const todayStart = startOfToday();
      const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [rows, totalRows, acceptTodayRows, rejectTodayRows, recentRows] = await Promise.all([
        this.prisma.$queryRaw<EventRow[]>`
          SELECT
            r.id,
            r.username,
            r.reply,
            r.calledstationid AS "calledStationId",
            r.callingstationid AS "callingStationId",
            r.authdate,
            r.class
          FROM radpostauth r
          WHERE ${filterSql}
          ORDER BY r.authdate DESC
          OFFSET ${skip}
          LIMIT ${take}
        `,
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM radpostauth r
          WHERE ${filterSql}
        `,
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM radpostauth r
          WHERE ${orgCredentialMatchSql(orgId)}
            AND r.authdate >= ${todayStart}
            AND ${outcomeSql('ACCEPT')!}
        `,
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM radpostauth r
          WHERE ${orgCredentialMatchSql(orgId)}
            AND r.authdate >= ${todayStart}
            AND ${outcomeSql('REJECT')!}
        `,
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM radpostauth r
          WHERE ${orgCredentialMatchSql(orgId)}
            AND r.authdate >= ${recentSince}
        `,
      ]);

      const total = Number(totalRows[0]?.count ?? 0);
      const acceptToday = Number(acceptTodayRows[0]?.count ?? 0);
      const rejectToday = Number(rejectTodayRows[0]?.count ?? 0);
      const recentCount = Number(recentRows[0]?.count ?? 0);

      responseSuccess(res, {
        message: 'Success',
        data: rows.map(serializeEvent),
        meta: mergeNetworkOrgMeta(scope, {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
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
        message:
          'Post-authentication events are written by FreeRADIUS and cannot be modified from the console.',
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
