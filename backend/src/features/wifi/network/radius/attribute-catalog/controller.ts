import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { orgScopedFreeradiusAttributeTakenMessage } from '@/features/wifi/shared/conflict-messages';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import {
  enforceScopedOrgId,
  mergeNetworkOrgMeta,
  resolveNetworkOrgScope,
} from '@/features/wifi/network/shared/resolve-network-org';
import {
  NetworkRadiusAttributeCatalogCreateSchema,
  NetworkRadiusAttributeCatalogUpdateSchema,
} from './schema';

const attributeSelect = {
  id: true,
  orgId: true,
  freeradiusName: true,
  displayName: true,
  op: true,
  defaultValue: true,
  valueType: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { vendorProfileLinks: true } },
} satisfies Prisma.RouterSupportedAttributeSelect;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function buildWhere(
  orgId: string,
  query: AuthenticatedRequest['query']
): Prisma.RouterSupportedAttributeWhereInput {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const valueType =
    typeof query.valueType === 'string' ? query.valueType.trim().toUpperCase() : '';

  const where: Prisma.RouterSupportedAttributeWhereInput = { orgId };

  if (valueType) {
    where.valueType = valueType as Prisma.EnumRadiusAttrValueTypeFilter['equals'];
  }

  if (search) {
    where.OR = [
      { freeradiusName: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
      { defaultValue: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

function handleOrgScopeError(res: Response, err: unknown): boolean {
  if (!err || typeof err !== 'object' || !('status' in err)) {
    return false;
  }
  const status = Number((err as { status: number }).status);
  const code =
    'code' in err ? String((err as { code: string }).code) : 'ORG_REQUIRED';
  const message = err instanceof Error ? err.message : 'Organization context is required.';
  responseError(res, status, { code, message });
  return true;
}

/** menus.wifi.network.radius.attribute-catalog @route /wifi/network/radius/attribute-catalog */
export class NetworkRadiusAttributeCatalogController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        if ('requiresOrgSelection' in scope) {
          return responseError(res, 400, {
            code: 'ORG_REQUIRED',
            message: 'Select an organization to continue.',
          });
        }

        const row = await this.prisma.routerSupportedAttribute.findFirst({
          where: { id: req.params.id, orgId: scope.orgId },
          select: attributeSelect,
        });

        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Attribute not found.',
          });
        }

        return responseSuccess(res, { message: 'Success', data: row });
      }

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

      const where = buildWhere(scope.orgId, req.query);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, typeGroups] = await Promise.all([
        this.prisma.routerSupportedAttribute.findMany({
          where,
          select: attributeSelect,
          orderBy: [{ freeradiusName: 'asc' }],
          skip,
          take,
        }),
        this.prisma.routerSupportedAttribute.count({ where }),
        this.prisma.routerSupportedAttribute.groupBy({
          by: ['valueType'],
          where: { orgId: scope.orgId },
          _count: { _all: true },
        }),
      ]);

      const valueTypeCounts = Object.fromEntries(
        typeGroups.map((row) => [row.valueType, row._count._all])
      );

      const linkedCount = await this.prisma.radiusVendorProfileSupportedAttribute.count({
        where: { orgId: scope.orgId },
      });

      responseSuccess(res, {
        message: 'Success',
        data: rows,
        meta: mergeNetworkOrgMeta(scope, {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          valueTypeCounts,
          vendorProfileLinks: linkedCount,
        }),
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');
      const adminId = req.userId!;

      let orgId: string;
      try {
        const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);
        orgId = enforceScopedOrgId(scope);
      } catch (err) {
        if (handleOrgScopeError(res, err)) return;
        throw err;
      }

      const { error, value } = (isUpdate
        ? NetworkRadiusAttributeCatalogUpdateSchema
        : NetworkRadiusAttributeCatalogCreateSchema
      ).validate(req.body, { abortEarly: false, allowUnknown: false });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (isUpdate) {
        const existing = await this.prisma.routerSupportedAttribute.findFirst({
          where: { id: recordId!, orgId },
          select: {
            id: true,
            orgId: true,
            freeradiusName: true,
            _count: { select: { vendorProfileLinks: true } },
          },
        });

        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Attribute not found.',
          });
        }

        if (
          value.freeradiusName &&
          value.freeradiusName !== existing.freeradiusName &&
          existing._count.vendorProfileLinks > 0
        ) {
          return responseError(res, 409, {
            code: 'ATTRIBUTE_IN_USE',
            message: 'Cannot rename an attribute linked to vendor profiles.',
          });
        }

        if (value.freeradiusName && value.freeradiusName !== existing.freeradiusName) {
          const duplicate = await this.prisma.routerSupportedAttribute.findFirst({
            where: {
              orgId,
              freeradiusName: value.freeradiusName,
              id: { not: recordId! },
            },
            select: { id: true },
          });
          if (duplicate) {
            return responseError(res, 409, {
              code: 'NAME_EXISTS',
              message: orgScopedFreeradiusAttributeTakenMessage(value.freeradiusName),
            });
          }
        }

        const updated = await this.prisma.routerSupportedAttribute.update({
          where: { id: recordId! },
          data: {
            ...(value.freeradiusName !== undefined ? { freeradiusName: value.freeradiusName } : {}),
            ...(value.displayName !== undefined ? { displayName: value.displayName } : {}),
            ...(value.op !== undefined ? { op: value.op } : {}),
            ...(value.defaultValue !== undefined
              ? { defaultValue: value.defaultValue?.trim() || null }
              : {}),
            ...(value.valueType !== undefined ? { valueType: value.valueType } : {}),
            ...(value.note !== undefined ? { note: value.note?.trim() || null } : {}),
          },
          select: attributeSelect,
        });

        return responseSuccess(res, {
          message: 'Attribute updated',
          data: updated,
        });
      }

      const duplicate = await this.prisma.routerSupportedAttribute.findFirst({
        where: { orgId, freeradiusName: value.freeradiusName },
        select: { id: true },
      });
      if (duplicate) {
        return responseError(res, 409, {
          code: 'NAME_EXISTS',
          message: orgScopedFreeradiusAttributeTakenMessage(value.freeradiusName),
        });
      }

      const created = await this.prisma.routerSupportedAttribute.create({
        data: {
          orgId,
          freeradiusName: value.freeradiusName,
          displayName: value.displayName,
          op: value.op ?? ':=',
          defaultValue: value.defaultValue?.trim() || null,
          valueType: value.valueType ?? 'STRING',
          note: value.note?.trim() || null,
        },
        select: attributeSelect,
      });

      responseSuccess(res, {
        message: 'Attribute created',
        data: created,
      });
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;

      let orgId: string;
      try {
        const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);
        orgId = enforceScopedOrgId(scope);
      } catch (err) {
        if (handleOrgScopeError(res, err)) return;
        throw err;
      }

      const id = req.params.id;
      const existing = await this.prisma.routerSupportedAttribute.findFirst({
        where: { id, orgId },
        select: {
          id: true,
          freeradiusName: true,
          _count: { select: { vendorProfileLinks: true } },
        },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Attribute not found.',
        });
      }

      if (existing._count.vendorProfileLinks > 0) {
        return responseError(res, 409, {
          code: 'ATTRIBUTE_IN_USE',
          message:
            'Cannot remove an attribute linked to vendor profiles. Unlink it from profiles first.',
        });
      }

      await this.prisma.routerSupportedAttribute.delete({ where: { id } });

      responseSuccess(res, { message: 'Attribute removed' });
    }),
  ];
}
