import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import {
  enforceScopedOrgId,
  mergeNetworkOrgMeta,
  resolveNetworkOrgScope,
} from '@/features/wifi/network/shared/resolve-network-org';
import {
  NetworkRadiusProfilesCreateSchema,
  NetworkRadiusProfilesUpdateSchema,
} from './schema';

const sourceStationSelect = {
  id: true,
  code: true,
  name: true,
} satisfies Prisma.WifiStationSelect;

const profileListSelect = {
  id: true,
  orgId: true,
  name: true,
  sharedSecret: true,
  serverHost: true,
  nasType: true,
  nasPorts: true,
  community: true,
  note: true,
  isActive: true,
  sourceStationId: true,
  createdAt: true,
  updatedAt: true,
  sourceStation: { select: sourceStationSelect },
  _count: { select: { devices: true } },
} satisfies Prisma.OrgRadiusProfileSelect;

type ProfileRow = Prisma.OrgRadiusProfileGetPayload<{ select: typeof profileListSelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function sanitizeListRow(row: ProfileRow) {
  const { sharedSecret, ...rest } = row;
  return {
    ...rest,
    hasSharedSecret: Boolean(sharedSecret),
  };
}

function sanitizeDetailRow(row: ProfileRow) {
  return sanitizeListRow(row);
}

function buildWhere(
  orgId: string,
  query: AuthenticatedRequest['query']
): Prisma.OrgRadiusProfileWhereInput {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const where: Prisma.OrgRadiusProfileWhereInput = { orgId, deletedAt: null };

  if (query.isActive === 'true') where.isActive = true;
  if (query.isActive === 'false') where.isActive = false;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { serverHost: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
      { sourceStation: { code: { contains: search, mode: 'insensitive' } } },
      { sourceStation: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

function handleOrgScopeError(res: Response, err: unknown): boolean {
  if (!err || typeof err !== 'object' || !('status' in err)) {
    return false;
  }
  const status = Number((err as { status: number }).status);
  const code = 'code' in err ? String((err as { code: string }).code) : 'ORG_REQUIRED';
  const message = err instanceof Error ? err.message : 'Organization context is required.';
  responseError(res, status, { code, message });
  return true;
}

async function syncDevicesFromProfile(
  tx: Prisma.TransactionClient,
  profile: {
    id: string;
    orgId: string;
    serverHost: string | null;
  }
) {
  // Only propagate host; NAS client secrets stay on each device.
  await tx.stationDevice.updateMany({
    where: { radiusProfileId: profile.id, orgId: profile.orgId, deletedAt: null },
    data: {
      nasServer: profile.serverHost,
    },
  });
}

/** menus.wifi.network.radius.servers @route /wifi/network/radius/servers */
export class NetworkRadiusProfilesController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);

      if ('requiresOrgSelection' in scope) {
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

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const row = await this.prisma.orgRadiusProfile.findFirst({
          where: { id: req.params.id, orgId, deletedAt: null },
          select: profileListSelect,
        });

        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'FreeRADIUS server not found.',
          });
        }

        return responseSuccess(res, {
          message: 'Success',
          data: sanitizeDetailRow(row),
          meta: mergeNetworkOrgMeta(scope, {}),
        });
      }

      const where = buildWhere(orgId, req.query);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, activeCount] = await Promise.all([
        this.prisma.orgRadiusProfile.findMany({
          where,
          select: profileListSelect,
          orderBy: [{ name: 'asc' }],
          skip,
          take,
        }),
        this.prisma.orgRadiusProfile.count({ where }),
        this.prisma.orgRadiusProfile.count({
          where: { orgId, deletedAt: null, isActive: true },
        }),
      ]);

      responseSuccess(res, {
        message: 'Success',
        data: rows.map(sanitizeListRow),
        meta: mergeNetworkOrgMeta(scope, {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          activeCount,
        }),
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);
      if ('requiresOrgSelection' in scope) {
        return responseError(res, 400, {
          code: 'ORG_REQUIRED',
          message: 'Select an organization to manage FreeRADIUS servers.',
        });
      }

      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');

      const { error, value } = (isUpdate
        ? NetworkRadiusProfilesUpdateSchema
        : NetworkRadiusProfilesCreateSchema
      ).validate(req.body, { abortEarly: false, allowUnknown: false });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      let orgId: string;
      try {
        orgId = enforceScopedOrgId(scope, null);
      } catch (err: unknown) {
        if (handleOrgScopeError(res, err)) return;
        throw err;
      }

      if (isUpdate) {
        const existing = await this.prisma.orgRadiusProfile.findFirst({
          where: { id: recordId!, orgId, deletedAt: null },
          select: { id: true, sharedSecret: true },
        });

        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'FreeRADIUS server not found.',
          });
        }

        const nextName =
          value.name !== undefined ? String(value.name).trim() : undefined;
        if (nextName) {
          const clash = await this.prisma.orgRadiusProfile.findFirst({
            where: {
              orgId,
              deletedAt: null,
              name: nextName,
              NOT: { id: recordId! },
            },
            select: { id: true },
          });
          if (clash) {
            return responseError(res, 409, {
              code: 'DUPLICATE_NAME',
              message: 'A FreeRADIUS server with this name already exists for this tenant.',
            });
          }
        }

        const secretInput =
          value.sharedSecret !== undefined
            ? String(value.sharedSecret ?? '').trim()
            : undefined;
        const sharedSecret =
          secretInput === undefined
            ? existing.sharedSecret
            : secretInput === ''
              ? null
              : secretInput;

        try {
          const updated = await this.prisma.$transaction(async (tx) => {
            const row = await tx.orgRadiusProfile.update({
              where: { id: recordId! },
              data: {
                ...(nextName !== undefined ? { name: nextName } : {}),
                ...(value.sharedSecret !== undefined ? { sharedSecret } : {}),
                ...(value.serverHost !== undefined
                  ? { serverHost: value.serverHost?.trim() || null }
                  : {}),
                ...(value.nasType !== undefined
                  ? { nasType: value.nasType?.trim() || 'other' }
                  : {}),
                ...(value.nasPorts !== undefined ? { nasPorts: value.nasPorts } : {}),
                ...(value.community !== undefined
                  ? { community: value.community?.trim() || null }
                  : {}),
                ...(value.note !== undefined ? { note: value.note?.trim() || null } : {}),
                ...(value.isActive !== undefined ? { isActive: value.isActive } : {}),
              },
              select: profileListSelect,
            });

            await syncDevicesFromProfile(tx, {
              id: row.id,
              orgId: row.orgId,
              serverHost: row.serverHost,
            });

            return row;
          });

          return responseSuccess(res, {
            message: 'FreeRADIUS server updated',
            data: sanitizeDetailRow(updated),
          });
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            return responseError(res, 409, {
              code: 'DUPLICATE_NAME',
              message: 'A FreeRADIUS server with this name already exists for this tenant.',
            });
          }
          throw err;
        }
      }

      const name = String(value.name).trim();
      const clash = await this.prisma.orgRadiusProfile.findFirst({
        where: { orgId, deletedAt: null, name },
        select: { id: true },
      });
      if (clash) {
        return responseError(res, 409, {
          code: 'DUPLICATE_NAME',
          message: 'A FreeRADIUS server with this name already exists for this tenant.',
        });
      }

      try {
        const created = await this.prisma.orgRadiusProfile.create({
          data: {
            orgId,
            name,
            sharedSecret: value.sharedSecret?.trim() || null,
            serverHost: value.serverHost?.trim() || null,
            nasType: value.nasType?.trim() || 'other',
            nasPorts: value.nasPorts ?? null,
            community: value.community?.trim() || null,
            note: value.note?.trim() || null,
            isActive: value.isActive ?? true,
          },
          select: profileListSelect,
        });

        responseSuccess(res, {
          message: 'FreeRADIUS server created',
          data: sanitizeDetailRow(created),
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          return responseError(res, 409, {
            code: 'DUPLICATE_NAME',
            message: 'A FreeRADIUS server with this name already exists for this tenant.',
          });
        }
        throw err;
      }
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);
      if ('requiresOrgSelection' in scope) {
        return responseError(res, 400, {
          code: 'ORG_REQUIRED',
          message: 'Select an organization to manage FreeRADIUS servers.',
        });
      }

      const id = req.params.id;
      const existing = await this.prisma.orgRadiusProfile.findFirst({
        where: { id, orgId: scope.orgId, deletedAt: null },
        select: { id: true, _count: { select: { devices: true } } },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'FreeRADIUS server not found.',
        });
      }

      if (existing._count.devices > 0) {
        return responseError(res, 409, {
          code: 'IN_USE',
          message: `Cannot delete: ${existing._count.devices} NAS device(s) still use this FreeRADIUS server.`,
        });
      }

      await this.prisma.orgRadiusProfile.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });

      responseSuccess(res, { message: 'FreeRADIUS server removed' });
    }),
  ];
}
