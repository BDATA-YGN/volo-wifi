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
  scopedNetworkFormOrgs,
  toNetworkOrgMeta,
} from '@/features/wifi/network/shared/resolve-network-org';
import {
  NetworkNasDevicesCreateSchema,
  NetworkNasDevicesUpdateSchema,
} from './schema';

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

const deviceListSelect = {
  id: true,
  orgId: true,
  stationId: true,
  type: true,
  vendor: true,
  model: true,
  serialNo: true,
  macAddr: true,
  ipAddr: true,
  note: true,
  isRadiusClient: true,
  radiusSecret: true,
  nasShortname: true,
  nasType: true,
  nasPorts: true,
  nasServer: true,
  nasCommunity: true,
  createdAt: true,
  updatedAt: true,
  org: { select: orgSelect },
  station: { select: stationSelect },
} satisfies Prisma.StationDeviceSelect;

type DeviceRow = Prisma.StationDeviceGetPayload<{ select: typeof deviceListSelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function sanitizeListRow(row: DeviceRow) {
  const { radiusSecret, ...rest } = row;
  return {
    ...rest,
    hasRadiusSecret: Boolean(radiusSecret),
  };
}

function sanitizeDetailRow(row: DeviceRow) {
  return {
    ...row,
    hasRadiusSecret: Boolean(row.radiusSecret),
  };
}

function buildWhere(
  query: AuthenticatedRequest['query'],
  orgId: string
): Prisma.StationDeviceWhereInput {
  const stationId = typeof query.stationId === 'string' ? query.stationId.trim() : '';
  const type = typeof query.type === 'string' ? query.type.trim().toUpperCase() : '';
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  const where: Prisma.StationDeviceWhereInput = { deletedAt: null, orgId };
  if (stationId) where.stationId = stationId;
  if (type) where.type = type as Prisma.EnumDeviceTypeFilter['equals'];
  if (query.isRadiusClient === 'true') where.isRadiusClient = true;
  if (query.isRadiusClient === 'false') where.isRadiusClient = false;
  if (query.unassigned === 'true') where.stationId = null;

  if (search) {
    where.OR = [
      { vendor: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { serialNo: { contains: search, mode: 'insensitive' } },
      { macAddr: { contains: search, mode: 'insensitive' } },
      { ipAddr: { contains: search, mode: 'insensitive' } },
      { nasShortname: { contains: search, mode: 'insensitive' } },
      { org: { name: { contains: search, mode: 'insensitive' } } },
      { org: { code: { contains: search, mode: 'insensitive' } } },
      { station: { name: { contains: search, mode: 'insensitive' } } },
      { station: { code: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

async function validateStationBelongsToOrg(
  prisma: PrismaClient,
  orgId: string,
  stationId: string | null | undefined
): Promise<string | null> {
  if (!stationId) return null;

  const station = await prisma.wifiStation.findFirst({
    where: { id: stationId, orgId, deletedAt: null },
    select: { id: true },
  });

  if (!station) {
    return 'Selected site does not belong to this tenant or does not exist.';
  }

  return null;
}

/** menus.wifi.network.nas-devices @route /wifi/network/nas-devices */
export class NetworkNasDevicesController {
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
        const row = await this.prisma.stationDevice.findFirst({
          where: { id: req.params.id, deletedAt: null, orgId },
          select: deviceListSelect,
        });

        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'NAS device not found.',
          });
        }

        return responseSuccess(res, {
          message: 'Success',
          data: sanitizeDetailRow(row),
          meta: toNetworkOrgMeta(scope),
        });
      }

      const where = buildWhere(req.query, orgId);
      const orgScopeWhere = { deletedAt: null, orgId };
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, typeGroups, radiusCount, unassignedCount] = await Promise.all([
        this.prisma.stationDevice.findMany({
          where,
          select: deviceListSelect,
          orderBy: [{ updatedAt: 'desc' }],
          skip,
          take,
        }),
        this.prisma.stationDevice.count({ where }),
        this.prisma.stationDevice.groupBy({
          by: ['type'],
          where: orgScopeWhere,
          _count: { _all: true },
        }),
        this.prisma.stationDevice.count({
          where: { ...orgScopeWhere, isRadiusClient: true },
        }),
        this.prisma.stationDevice.count({
          where: { ...orgScopeWhere, stationId: null },
        }),
      ]);

      const typeCounts = Object.fromEntries(
        typeGroups.map((row) => [row.type, row._count._all])
      );

      responseSuccess(res, {
        message: 'Success',
        data: rows.map(sanitizeListRow),
        meta: mergeNetworkOrgMeta(scope, {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          typeCounts,
          radiusClientCount: radiusCount,
          unassignedCount,
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
          message: 'Select an organization to manage NAS devices.',
        });
      }

      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');

      const { error, value } = (isUpdate
        ? NetworkNasDevicesUpdateSchema
        : NetworkNasDevicesCreateSchema
      ).validate(req.body, { abortEarly: false, allowUnknown: false });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      let orgId: string;
      try {
        orgId = enforceScopedOrgId(scope, (value.orgId as string | undefined) ?? null);
      } catch (err: unknown) {
        const e = err as { status?: number; code?: string; message?: string };
        return responseError(res, e.status ?? 403, {
          code: e.code ?? 'FORBIDDEN_ORG',
          message: e.message ?? 'Organization scope mismatch.',
        });
      }
      const stationId =
        value.stationId === null ? null : (value.stationId as string | undefined);

      if (isUpdate) {
        const existing = await this.prisma.stationDevice.findFirst({
          where: { id: recordId!, deletedAt: null, orgId: scope.orgId },
          select: { id: true, orgId: true },
        });

        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'NAS device not found.',
          });
        }

        const targetOrgId = scope.orgId;
        const stationError = await validateStationBelongsToOrg(
          this.prisma,
          targetOrgId,
          stationId !== undefined ? stationId : undefined
        );
        if (stationError) {
          return responseError(res, 400, { code: 'INVALID_STATION', message: stationError });
        }

        const updated = await this.prisma.stationDevice.update({
          where: { id: recordId! },
          data: {
            orgId: targetOrgId,
            ...(stationId !== undefined ? { stationId } : {}),
            ...(value.type !== undefined ? { type: value.type } : {}),
            ...(value.vendor !== undefined ? { vendor: value.vendor?.trim() || null } : {}),
            ...(value.model !== undefined ? { model: value.model?.trim() || null } : {}),
            ...(value.serialNo !== undefined ? { serialNo: value.serialNo?.trim() || null } : {}),
            ...(value.macAddr !== undefined ? { macAddr: value.macAddr?.trim() || null } : {}),
            ...(value.ipAddr !== undefined ? { ipAddr: value.ipAddr?.trim() || null } : {}),
            ...(value.note !== undefined ? { note: value.note?.trim() || null } : {}),
            ...(value.isRadiusClient !== undefined
              ? { isRadiusClient: value.isRadiusClient }
              : {}),
            ...(value.radiusSecret !== undefined
              ? { radiusSecret: value.radiusSecret?.trim() || null }
              : {}),
            ...(value.nasShortname !== undefined
              ? { nasShortname: value.nasShortname?.trim() || null }
              : {}),
            ...(value.nasType !== undefined ? { nasType: value.nasType?.trim() || null } : {}),
            ...(value.nasPorts !== undefined ? { nasPorts: value.nasPorts } : {}),
            ...(value.nasServer !== undefined ? { nasServer: value.nasServer?.trim() || null } : {}),
            ...(value.nasCommunity !== undefined
              ? { nasCommunity: value.nasCommunity?.trim() || null }
              : {}),
          },
          select: deviceListSelect,
        });

        return responseSuccess(res, {
          message: 'NAS device updated',
          data: sanitizeDetailRow(updated),
        });
      }

      const stationError = await validateStationBelongsToOrg(
        this.prisma,
        orgId!,
        stationId
      );
      if (stationError) {
        return responseError(res, 400, { code: 'INVALID_STATION', message: stationError });
      }

      const created = await this.prisma.stationDevice.create({
        data: {
          orgId: orgId!,
          stationId: stationId ?? null,
          type: value.type ?? 'ROUTER',
          vendor: value.vendor?.trim() || null,
          model: value.model?.trim() || null,
          serialNo: value.serialNo?.trim() || null,
          macAddr: value.macAddr?.trim() || null,
          ipAddr: value.ipAddr?.trim() || null,
          note: value.note?.trim() || null,
          isRadiusClient: value.isRadiusClient ?? false,
          radiusSecret: value.radiusSecret?.trim() || null,
          nasShortname: value.nasShortname?.trim() || null,
          nasType: value.nasType?.trim() || 'other',
          nasPorts: value.nasPorts ?? null,
          nasServer: value.nasServer?.trim() || null,
          nasCommunity: value.nasCommunity?.trim() || null,
        },
        select: deviceListSelect,
      });

      responseSuccess(res, {
        message: 'NAS device created',
        data: sanitizeDetailRow(created),
      });
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);
      if ('requiresOrgSelection' in scope) {
        return responseError(res, 400, {
          code: 'ORG_REQUIRED',
          message: 'Select an organization to manage NAS devices.',
        });
      }

      const id = req.params.id;
      const existing = await this.prisma.stationDevice.findFirst({
        where: { id, deletedAt: null, orgId: scope.orgId },
        select: { id: true },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'NAS device not found.',
        });
      }

      await this.prisma.stationDevice.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      responseSuccess(res, { message: 'NAS device removed' });
    }),
  ];
}
