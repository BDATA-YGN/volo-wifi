import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import {
  canAccessOrg,
  isDeveloperAdmin,
  loadOrgMembershipOptions,
} from '@/features/wifi/shared/resolve-org';

const logSelect = {
  id: true,
  orgId: true,
  adminId: true,
  action: true,
  entity: true,
  entityId: true,
  meta: true,
  ip: true,
  userAgent: true,
  createdAt: true,
  admin: {
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
    },
  },
  org: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} satisfies Prisma.WifiAuditLogSelect;

type LogRow = Prisma.WifiAuditLogGetPayload<{ select: typeof logSelect }>;

type ActivityLogScope = {
  /** When set, results are limited to this org. Undefined = all orgs (developer only). */
  orgId: string | undefined;
  isDeveloper: boolean;
};

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

/**
 * Tenant users: always scoped to their own membership org(s) — never cross-tenant.
 * Developers: all orgs by default; optional orgId query filters to one tenant.
 */
async function resolveActivityLogScope(
  prisma: PrismaClient,
  req: AuthenticatedRequest
): Promise<ActivityLogScope> {
  const adminId = req.userId!;
  const isDeveloper = isDeveloperAdmin(req.user!);
  const requestedOrgId =
    typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';

  if (isDeveloper) {
    if (requestedOrgId) {
      const allowed = await canAccessOrg(prisma, adminId, requestedOrgId, true);
      if (!allowed) {
        throw Object.assign(new Error('You do not have access to this organization.'), {
          status: 403,
          code: 'FORBIDDEN_ORG',
        });
      }
      return { orgId: requestedOrgId, isDeveloper: true };
    }
    return { orgId: undefined, isDeveloper: true };
  }

  // Non-developers: membership-only (no platform-wide peek via orgId).
  const memberships = await loadOrgMembershipOptions(prisma, adminId, false);

  if (requestedOrgId) {
    const allowed = await canAccessOrg(prisma, adminId, requestedOrgId, false);
    if (!allowed) {
      throw Object.assign(new Error('You do not have access to this organization.'), {
        status: 403,
        code: 'FORBIDDEN_ORG',
      });
    }
    return { orgId: requestedOrgId, isDeveloper: false };
  }

  if (memberships.length === 0) {
    throw Object.assign(new Error('No organization is linked to your account.'), {
      status: 404,
      code: 'NO_ORG',
    });
  }

  if (memberships.length === 1) {
    return { orgId: memberships[0].id, isDeveloper: false };
  }

  const primary = memberships.find((m) => m.isPrimary);
  return { orgId: (primary ?? memberships[0]).id, isDeveloper: false };
}

function buildListWhere(
  orgId: string | undefined,
  query: AuthenticatedRequest['query']
): Prisma.WifiAuditLogWhereInput {
  const where: Prisma.WifiAuditLogWhereInput = {};
  if (orgId) where.orgId = orgId;

  const view = typeof query.view === 'string' ? query.view.trim().toLowerCase() : 'recent';
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const action = typeof query.action === 'string' ? query.action.trim() : '';
  const entity = typeof query.entity === 'string' ? query.entity.trim() : '';
  const createdFrom = parseDate(query.createdFrom);
  const createdTo = parseDate(query.createdTo);

  if (view === 'recent') {
    where.createdAt = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
  } else if (view === 'today') {
    where.createdAt = { gte: startOfToday() };
  }

  if (createdFrom || createdTo) {
    where.createdAt = {
      ...(typeof where.createdAt === 'object' && where.createdAt !== null ? where.createdAt : {}),
      ...(createdFrom && { gte: createdFrom }),
      ...(createdTo && { lte: createdTo }),
    };
  }

  if (action) {
    where.action = action;
  }

  if (entity) {
    where.entity = entity;
  }

  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { entity: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } },
      { ip: { contains: search, mode: 'insensitive' } },
      { admin: { fullName: { contains: search, mode: 'insensitive' } } },
      { admin: { username: { contains: search, mode: 'insensitive' } } },
      { admin: { email: { contains: search, mode: 'insensitive' } } },
      { org: { code: { contains: search, mode: 'insensitive' } } },
      { org: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

function serializeLog(row: LogRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    meta: row.meta ?? null,
  };
}

function scopeErrorResponse(res: Response, err: unknown): void {
  const status =
    err && typeof err === 'object' && 'status' in err
      ? Number((err as { status: number }).status)
      : 400;
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: string }).code)
      : 'ORG_REQUIRED';
  const message =
    err instanceof Error ? err.message : 'Organization context is required.';
  responseError(res, status, { code, message });
}

/** menus.wifi.tenant.activity-log @route /wifi/tenant/activity-log */
export class TenantActivityLogController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      if (req.query.formOptions === 'true') {
        let scope: ActivityLogScope;
        try {
          scope = await resolveActivityLogScope(this.prisma, req);
        } catch (err: unknown) {
          // Still return memberships so the UI can show an empty/no-access state.
          const memberships = await loadOrgMembershipOptions(
            this.prisma,
            adminId,
            isDeveloper
          );
          return responseSuccess(res, {
            message: 'Success',
            data: {
              memberships,
              actions: [],
              entities: [],
              canViewAllOrgs: isDeveloper,
              scopedOrgId: null,
            },
          });
        }

        const filterWhere: Prisma.WifiAuditLogWhereInput = scope.orgId
          ? { orgId: scope.orgId }
          : {};

        const [memberships, actionRows, entityRows] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          this.prisma.wifiAuditLog.findMany({
            where: filterWhere,
            distinct: ['action'],
            select: { action: true },
            orderBy: { action: 'asc' },
          }),
          this.prisma.wifiAuditLog.findMany({
            where: { ...filterWhere, entity: { not: null } },
            distinct: ['entity'],
            select: { entity: true },
            orderBy: { entity: 'asc' },
          }),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: {
            memberships,
            actions: actionRows.map((r) => r.action),
            entities: entityRows
              .map((r) => r.entity)
              .filter((e): e is string => Boolean(e)),
            canViewAllOrgs: isDeveloper,
            scopedOrgId: scope.orgId ?? null,
          },
        });
      }

      let scope: ActivityLogScope;
      try {
        scope = await resolveActivityLogScope(this.prisma, req);
      } catch (err: unknown) {
        return scopeErrorResponse(res, err);
      }

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const idParam = req.params.id as string | string[];
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        const row = await this.prisma.wifiAuditLog.findFirst({
          where: {
            id,
            ...(scope.orgId ? { orgId: scope.orgId } : {}),
          },
          select: logSelect,
        });

        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Activity log entry not found.',
          });
        }

        return responseSuccess(res, { message: 'Success', data: serializeLog(row) });
      }

      const view =
        typeof req.query.view === 'string' ? req.query.view.trim().toLowerCase() : 'recent';
      const where = buildListWhere(scope.orgId, req.query);
      const { page, limit, skip, take } = parsePagination(req.query);
      const todayStart = startOfToday();
      const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const scopeWhere: Prisma.WifiAuditLogWhereInput = scope.orgId
        ? { orgId: scope.orgId }
        : {};
      const todayWhere: Prisma.WifiAuditLogWhereInput = {
        ...scopeWhere,
        createdAt: { gte: todayStart },
      };

      const [rows, total, todayCount, recentCount, actorsToday, memberships] =
        await Promise.all([
          this.prisma.wifiAuditLog.findMany({
            where,
            select: logSelect,
            orderBy: { createdAt: 'desc' },
            skip,
            take,
          }),
          this.prisma.wifiAuditLog.count({ where }),
          this.prisma.wifiAuditLog.count({ where: todayWhere }),
          this.prisma.wifiAuditLog.count({
            where: { ...scopeWhere, createdAt: { gte: recentSince } },
          }),
          this.prisma.wifiAuditLog.findMany({
            where: todayWhere,
            distinct: ['adminId'],
            select: { adminId: true },
          }),
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
        ]);

      responseSuccess(res, {
        message: 'Success',
        data: rows.map(serializeLog),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          view,
          todayCount,
          recentCount,
          actorsToday: actorsToday.filter((r) => r.adminId).length,
          memberships,
          canViewAllOrgs: isDeveloper,
          scopedOrgId: scope.orgId ?? null,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'READ_ONLY',
        message: 'Audit log entries are system-written and cannot be modified from the console.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'READ_ONLY',
        message: 'Audit log entries cannot be deleted from the console.',
      });
    }),
  ];
}
