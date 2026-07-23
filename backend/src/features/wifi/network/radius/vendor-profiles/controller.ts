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
  NetworkRadiusVendorProfilesCreateSchema,
  NetworkRadiusVendorProfilesUpdateSchema,
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
} satisfies Prisma.RouterSupportedAttributeSelect;

const supportedRowSelect = {
  id: true,
  orgId: true,
  requirement: true,
  createdAt: true,
  attribute: { select: attributeSelect },
} satisfies Prisma.RadiusVendorProfileSupportedAttributeSelect;

const profileListSelect = {
  id: true,
  orgId: true,
  name: true,
  vendor: true,
  model: true,
  description: true,
  supportsCoA: true,
  coaPort: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      supportedAttributeRows: true,
      wifiStations: true,
      planAttributes: true,
    },
  },
} satisfies Prisma.RadiusVendorProfileSelect;

const profileDetailSelect = {
  ...profileListSelect,
  supportedAttributeRows: {
    orderBy: [{ attribute: { freeradiusName: 'asc' } }],
    select: supportedRowSelect,
  },
} satisfies Prisma.RadiusVendorProfileSelect;

type ProfileDetailRow = Prisma.RadiusVendorProfileGetPayload<{ select: typeof profileDetailSelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function buildWhere(
  orgId: string,
  query: AuthenticatedRequest['query']
): Prisma.RadiusVendorProfileWhereInput {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const vendor = typeof query.vendor === 'string' ? query.vendor.trim() : '';

  const where: Prisma.RadiusVendorProfileWhereInput = { orgId, deletedAt: null };

  if (vendor) {
    where.vendor = { contains: vendor, mode: 'insensitive' };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { vendor: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
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

type SupportedAttrInput = { attributeId: string; requirement: 'OPTIONAL' | 'MUST' };

async function replaceSupportedAttributes(
  tx: Prisma.TransactionClient,
  orgId: string,
  profileId: string,
  rows: SupportedAttrInput[]
) {
  const unique = new Map<string, 'OPTIONAL' | 'MUST'>();
  for (const row of rows) {
    unique.set(row.attributeId, row.requirement);
  }

  const attributeIds = [...unique.keys()];
  if (attributeIds.length) {
    const found = await tx.routerSupportedAttribute.count({
      where: { id: { in: attributeIds }, orgId },
    });
    if (found !== attributeIds.length) {
      throw new Error('One or more selected attributes are not in this organization catalog.');
    }
  }

  await tx.radiusVendorProfileSupportedAttribute.deleteMany({
    where: { vendorProfileId: profileId, orgId },
  });

  if (attributeIds.length) {
    await tx.radiusVendorProfileSupportedAttribute.createMany({
      data: attributeIds.map((attributeId) => ({
        orgId,
        vendorProfileId: profileId,
        attributeId,
        requirement: unique.get(attributeId) ?? 'OPTIONAL',
      })),
    });
  }
}

/** menus.wifi.network.radius.vendor-profiles @route /wifi/network/radius/vendor-profiles */
export class NetworkRadiusVendorProfilesController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const scope = await resolveNetworkOrgScope(this.prisma, adminId, req.user, req.query);

      if (req.query.catalog === 'true') {
        if ('requiresOrgSelection' in scope) {
          return responseError(res, 400, {
            code: 'ORG_REQUIRED',
            message: 'Select an organization to continue.',
          });
        }

        const attributes = await this.prisma.routerSupportedAttribute.findMany({
          where: { orgId: scope.orgId },
          select: attributeSelect,
          orderBy: [{ freeradiusName: 'asc' }],
        });

        return responseSuccess(res, {
          message: 'Success',
          data: { attributes },
        });
      }

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        if ('requiresOrgSelection' in scope) {
          return responseError(res, 400, {
            code: 'ORG_REQUIRED',
            message: 'Select an organization to continue.',
          });
        }

        const row = await this.prisma.radiusVendorProfile.findFirst({
          where: { id: req.params.id, orgId: scope.orgId, deletedAt: null },
          select: profileDetailSelect,
        });

        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Vendor profile not found.',
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

      const [rows, total, vendorGroups] = await Promise.all([
        this.prisma.radiusVendorProfile.findMany({
          where,
          select: profileListSelect,
          orderBy: [{ vendor: 'asc' }, { name: 'asc' }],
          skip,
          take,
        }),
        this.prisma.radiusVendorProfile.count({ where }),
        this.prisma.radiusVendorProfile.groupBy({
          by: ['vendor'],
          where: { orgId: scope.orgId, deletedAt: null },
          _count: { _all: true },
        }),
      ]);

      const vendorCounts = Object.fromEntries(
        vendorGroups.map((row) => [row.vendor, row._count._all])
      );

      const totalAttributes = await this.prisma.radiusVendorProfileSupportedAttribute.count({
        where: { orgId: scope.orgId, vendorProfile: { deletedAt: null } },
      });

      responseSuccess(res, {
        message: 'Success',
        data: rows,
        meta: mergeNetworkOrgMeta(scope, {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          vendorCounts,
          totalAttributeLinks: totalAttributes,
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
        ? NetworkRadiusVendorProfilesUpdateSchema
        : NetworkRadiusVendorProfilesCreateSchema
      ).validate(req.body, { abortEarly: false, allowUnknown: false });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const supportedAttributes = value.supportedAttributes as SupportedAttrInput[] | undefined;

      if (isUpdate) {
        const existing = await this.prisma.radiusVendorProfile.findFirst({
          where: { id: recordId!, orgId, deletedAt: null },
          select: { id: true },
        });

        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Vendor profile not found.',
          });
        }

        let updated: Prisma.RadiusVendorProfileGetPayload<{ select: typeof profileListSelect }>;
        try {
          updated = await this.prisma.$transaction(async (tx) => {
            if (supportedAttributes !== undefined) {
              await replaceSupportedAttributes(tx, orgId, recordId!, supportedAttributes);
            }

            return tx.radiusVendorProfile.update({
              where: { id: recordId! },
              data: {
                ...(value.name !== undefined ? { name: value.name } : {}),
                ...(value.vendor !== undefined ? { vendor: value.vendor } : {}),
                ...(value.model !== undefined ? { model: value.model?.trim() || null } : {}),
                ...(value.description !== undefined
                  ? { description: value.description?.trim() || null }
                  : {}),
                ...(value.supportsCoA !== undefined ? { supportsCoA: value.supportsCoA } : {}),
                ...(value.coaPort !== undefined ? { coaPort: value.coaPort } : {}),
              },
              // List shape is enough for mutations — detail attrs are reloaded on demand.
              select: profileListSelect,
            });
          });
        } catch (err) {
          return responseError(res, 400, {
            code: 'INVALID_ATTRIBUTES',
            message: err instanceof Error ? err.message : 'Invalid attribute selection.',
          });
        }

        return responseSuccess(res, {
          message: 'Vendor profile updated',
          data: updated,
        });
      }

      let created: ProfileDetailRow;
      try {
        created = await this.prisma.$transaction(async (tx) => {
          const profile = await tx.radiusVendorProfile.create({
            data: {
              orgId,
              name: value.name,
              vendor: value.vendor ?? 'Ruijie',
              model: value.model?.trim() || null,
              description: value.description?.trim() || null,
              supportsCoA: value.supportsCoA ?? true,
              coaPort: value.coaPort ?? 3799,
            },
            select: profileDetailSelect,
          });

          if (supportedAttributes?.length) {
            const attributeIds = supportedAttributes.map((r) => r.attributeId);
            const found = await tx.routerSupportedAttribute.count({
              where: { id: { in: attributeIds }, orgId },
            });
            if (found !== attributeIds.length) {
              throw new Error('One or more selected attributes are not in this organization catalog.');
            }

            await tx.radiusVendorProfileSupportedAttribute.createMany({
              data: supportedAttributes.map((row) => ({
                orgId,
                vendorProfileId: profile.id,
                attributeId: row.attributeId,
                requirement: row.requirement ?? 'OPTIONAL',
              })),
            });
          }

          return tx.radiusVendorProfile.findUniqueOrThrow({
            where: { id: profile.id },
            select: profileDetailSelect,
          });
        });
      } catch (err) {
        return responseError(res, 400, {
          code: 'CREATE_FAILED',
          message: err instanceof Error ? err.message : 'Failed to create vendor profile.',
        });
      }

      responseSuccess(res, {
        message: 'Vendor profile created',
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
      const existing = await this.prisma.radiusVendorProfile.findFirst({
        where: { id, orgId, deletedAt: null },
        select: {
          id: true,
          _count: { select: { wifiStations: true, planAttributes: true } },
        },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Vendor profile not found.',
        });
      }

      if (existing._count.wifiStations > 0 || existing._count.planAttributes > 0) {
        return responseError(res, 409, {
          code: 'PROFILE_IN_USE',
          message:
            'Cannot remove a vendor profile assigned to WiFi sites or plan RADIUS policies.',
        });
      }

      await this.prisma.radiusVendorProfile.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      responseSuccess(res, { message: 'Vendor profile removed' });
    }),
  ];
}
