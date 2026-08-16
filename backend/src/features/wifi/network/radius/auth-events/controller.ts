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
import { sanitizeCaptiveClientIp } from '@/features/captive/utils/captive-client-ip';
import {
  resolveAllowedStationIds,
  stationPkScope,
} from '@/features/wifi/shared/resolve-station-scope';

type EventRow = {
  id: bigint;
  username: string;
  reply: string | null;
  calledStationId: string | null;
  callingStationId: string | null;
  authdate: Date;
  class: string | null;
  stationId: string | null;
  stationCode: string | null;
  stationName: string | null;
  nasIdentifier: string | null;
  clientIp: string | null;
};

export type AuthEventOutcome = 'ACCEPT' | 'REJECT' | 'UNKNOWN';

const stationSelect = {
  id: true,
  code: true,
  name: true,
  status: true,
} satisfies Prisma.WifiStationSelect;

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
    stationId: row.stationId,
    station: row.stationId
      ? {
          id: row.stationId,
          code: row.stationCode ?? '',
          name: row.stationName ?? '',
        }
      : null,
    nasIdentifier: row.nasIdentifier,
    // Never surface hosting/portal edge IPs as the subscriber device address.
    clientIp: sanitizeCaptiveClientIp(row.clientIp),
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

/**
 * Enrich FreeRADIUS post-auth rows with site / NAS / client MAC from
 * credential → station, captive portal session, and radius accounting session.
 */
function eventJoinSql(orgId: string): Prisma.Sql {
  return Prisma.sql`
    LEFT JOIN LATERAL (
      SELECT c.station_id AS station_id
      FROM wf_credential c
      WHERE c.org_id = ${orgId}
        AND c.deleted_at IS NULL
        AND (c.username = r.username OR c.token = r.username)
      ORDER BY c.updated_at DESC NULLS LAST
      LIMIT 1
    ) cred ON true
    LEFT JOIN wf_station st_cred
      ON st_cred.id = cred.station_id
     AND st_cred.deleted_at IS NULL
    LEFT JOIN LATERAL (
      SELECT
        cps.mac AS mac,
        cps.ip AS ip,
        cps."nasParams" AS nas_params
      FROM wf_captive_portal_session cps
      WHERE cps.org_id = ${orgId}
        AND cps.username = r.username
        AND cps.created_at BETWEEN r.authdate - INTERVAL '30 minutes'
                              AND r.authdate + INTERVAL '30 minutes'
      ORDER BY ABS(EXTRACT(EPOCH FROM (cps.created_at - r.authdate)))
      LIMIT 1
    ) cap ON true
    LEFT JOIN LATERAL (
      SELECT
        rs."callingStationId" AS calling_station_id,
        rs.nas_identifier AS nas_identifier,
        rs.station_id AS station_id,
        rs.framed_ip_address AS framed_ip_address
      FROM wf_radius_session rs
      WHERE rs.org_id = ${orgId}
        AND rs.user_name = r.username
        AND rs.started_at BETWEEN r.authdate - INTERVAL '5 minutes'
                             AND r.authdate + INTERVAL '2 hours'
      ORDER BY rs.started_at ASC
      LIMIT 1
    ) sess ON true
    LEFT JOIN wf_station st_sess
      ON st_sess.id = sess.station_id
     AND st_sess.deleted_at IS NULL
  `;
}

function eventSelectSql(): Prisma.Sql {
  return Prisma.sql`
    r.id,
    r.username,
    r.reply,
    r.calledstationid AS "calledStationId",
    COALESCE(
      NULLIF(btrim(r.callingstationid), ''),
      NULLIF(btrim(cap.mac), ''),
      NULLIF(btrim(sess.calling_station_id), '')
    ) AS "callingStationId",
    r.authdate,
    r.class,
    COALESCE(st_cred.id, st_sess.id) AS "stationId",
    COALESCE(st_cred.code, st_sess.code) AS "stationCode",
    COALESCE(st_cred.name, st_sess.name) AS "stationName",
    COALESCE(
      NULLIF(btrim(st_cred."nasIdentifier"), ''),
      NULLIF(btrim(sess.nas_identifier), ''),
      NULLIF(btrim(cap.nas_params->>'NASID'), ''),
      NULLIF(btrim(cap.nas_params->>'nasid'), ''),
      NULLIF(btrim(cap.nas_params->>'nas_id'), ''),
      NULLIF(btrim(st_sess."nasIdentifier"), '')
    ) AS "nasIdentifier",
    COALESCE(
      NULLIF(btrim(cap.ip), ''),
      NULLIF(btrim(sess.framed_ip_address), '')
    ) AS "clientIp"
  `;
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

function stationAllowSql(
  allowedStationIds: string[] | null,
  requestedStationId = ''
): Prisma.Sql | null {
  if (requestedStationId) {
    if (allowedStationIds && !allowedStationIds.includes(requestedStationId)) {
      return Prisma.sql`FALSE`;
    }
    return Prisma.sql`(
      cred.station_id = ${requestedStationId}
      OR sess.station_id = ${requestedStationId}
    )`;
  }
  if (!allowedStationIds) return null;
  if (allowedStationIds.length === 0) return Prisma.sql`FALSE`;
  return Prisma.sql`COALESCE(cred.station_id, sess.station_id) IN (${Prisma.join(allowedStationIds)})`;
}

function buildFilterSql(
  orgId: string,
  query: AuthenticatedRequest['query'],
  opts?: { ignoreView?: boolean; allowedStationIds?: string[] | null }
): Prisma.Sql {
  const parts: Prisma.Sql[] = [orgCredentialMatchSql(orgId)];

  const outcome = typeof query.outcome === 'string' ? query.outcome.trim() : '';
  const view = typeof query.view === 'string' ? query.view.trim().toLowerCase() : 'recent';
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const stationId = typeof query.stationId === 'string' ? query.stationId.trim() : '';
  const authFrom = parseDate(query.authFrom);
  const authTo = parseDate(query.authTo);
  const stationPart = stationAllowSql(opts?.allowedStationIds ?? null, stationId);

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

  if (stationPart) parts.push(stationPart);

  if (search) {
    const like = `%${search}%`;
    parts.push(Prisma.sql`(
      r.username ILIKE ${like}
      OR r.callingstationid ILIKE ${like}
      OR r.calledstationid ILIKE ${like}
      OR r.reply ILIKE ${like}
      OR r.class ILIKE ${like}
      OR COALESCE(st_cred.code, st_sess.code) ILIKE ${like}
      OR COALESCE(st_cred.name, st_sess.name) ILIKE ${like}
      OR COALESCE(st_cred."nasIdentifier", sess.nas_identifier, st_sess."nasIdentifier") ILIKE ${like}
      OR COALESCE(cap.mac, sess.calling_station_id) ILIKE ${like}
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
      const allowedStationIds = await resolveAllowedStationIds(
        this.prisma,
        adminId,
        orgId,
        req.user!
      );

      if (req.query.formOptions === 'true') {
        const stations = await this.prisma.wifiStation.findMany({
          where: { orgId, deletedAt: null, ...stationPkScope(allowedStationIds) },
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

        const detailStationSql = stationAllowSql(allowedStationIds);
        const detailStationAnd = detailStationSql
          ? Prisma.sql`AND ${detailStationSql}`
          : Prisma.empty;
        const rows = await this.prisma.$queryRaw<EventRow[]>`
          SELECT
            ${eventSelectSql()}
          FROM radpostauth r
          ${eventJoinSql(orgId)}
          WHERE r.id = ${id}
            AND ${orgCredentialMatchSql(orgId)}
            ${detailStationAnd}
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
      const filterSql = buildFilterSql(orgId, req.query, { allowedStationIds });
      const todayStart = startOfToday();
      const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const kpiStationSql = stationAllowSql(allowedStationIds);
      const kpiStationAnd = kpiStationSql ? Prisma.sql`AND ${kpiStationSql}` : Prisma.empty;

      const [rows, totalRows, acceptTodayRows, rejectTodayRows, recentRows] = await Promise.all([
        this.prisma.$queryRaw<EventRow[]>`
          SELECT
            ${eventSelectSql()}
          FROM radpostauth r
          ${eventJoinSql(orgId)}
          WHERE ${filterSql}
          ORDER BY r.authdate DESC
          OFFSET ${skip}
          LIMIT ${take}
        `,
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM radpostauth r
          ${eventJoinSql(orgId)}
          WHERE ${filterSql}
        `,
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM radpostauth r
          ${eventJoinSql(orgId)}
          WHERE ${orgCredentialMatchSql(orgId)}
            AND r.authdate >= ${todayStart}
            AND ${outcomeSql('ACCEPT')!}
            ${kpiStationAnd}
        `,
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM radpostauth r
          ${eventJoinSql(orgId)}
          WHERE ${orgCredentialMatchSql(orgId)}
            AND r.authdate >= ${todayStart}
            AND ${outcomeSql('REJECT')!}
            ${kpiStationAnd}
        `,
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM radpostauth r
          ${eventJoinSql(orgId)}
          WHERE ${orgCredentialMatchSql(orgId)}
            AND r.authdate >= ${recentSince}
            ${kpiStationAnd}
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
