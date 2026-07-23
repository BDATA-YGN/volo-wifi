import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { orgScopedCodeTakenMessage } from '@/features/wifi/shared/conflict-messages';
import {
  isDeveloperAdmin,
  loadOrgMembershipOptions,
  resolveOrgIdForAdmin,
} from '@/features/wifi/shared/resolve-org';
import { STATION_STATUSES, type StationStatus } from './constants';
import { SitesCreateSchema, SitesUpdateSchema } from './schema';

const stationSelect = {
  id: true,
  orgId: true,
  code: true,
  name: true,
  location: true,
  township: true,
  address: true,
  status: true,
  stationSizeId: true,
  portalBaseUrl: true,
  nasIdentifier: true,
  radiusClientIp: true,
  radiusSecret: true,
  vlanId: true,
  radiusVendorProfileId: true,
  createdAt: true,
  updatedAt: true,
  stationSize: {
    select: { id: true, code: true, name: true, sortOrder: true, isActive: true },
  },
  radiusVendorProfile: {
    select: { id: true, name: true, vendor: true, model: true },
  },
  _count: {
    select: {
      devices: { where: { deletedAt: null } },
      credentials: true,
      sales: true,
      sessions: true,
    },
  },
} satisfies Prisma.WifiStationSelect;

type StationRow = Prisma.WifiStationGetPayload<{ select: typeof stationSelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

async function resolveOrgFromRequest(
  prisma: PrismaClient,
  req: AuthenticatedRequest
): Promise<string> {
  const adminId = req.userId!;
  const requestedOrgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
  const resolved = await resolveOrgIdForAdmin(
    prisma,
    adminId,
    req.user!,
    requestedOrgId || undefined
  );
  if ('requiresSelection' in resolved) {
    throw Object.assign(new Error('Select an organization to manage sites.'), {
      status: 400,
      code: 'ORG_REQUIRED',
    });
  }
  return resolved.orgId;
}

function serializeStation(row: StationRow) {
  const { radiusSecret, ...rest } = row;
  return {
    ...rest,
    isBillable: row.status === 'ACTIVE',
    hasRadiusSecret: Boolean(radiusSecret),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildListWhere(
  orgId: string,
  query: AuthenticatedRequest['query']
): Prisma.WifiStationWhereInput {
  const where: Prisma.WifiStationWhereInput = { orgId, deletedAt: null };
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
  const stationSizeId =
    typeof query.stationSizeId === 'string' ? query.stationSizeId.trim() : '';
  const township = typeof query.township === 'string' ? query.township.trim() : '';

  if (status && (STATION_STATUSES as readonly string[]).includes(status)) {
    where.status = status as StationStatus;
  }

  if (stationSizeId) {
    where.stationSizeId = stationSizeId;
  }

  if (township) {
    where.township = { equals: township, mode: 'insensitive' };
  }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
      { township: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { nasIdentifier: { contains: search, mode: 'insensitive' } },
      { radiusClientIp: { contains: search, mode: 'insensitive' } },
      { stationSize: { code: { contains: search, mode: 'insensitive' } } },
      { stationSize: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

async function loadLicenseMeta(prisma: PrismaClient, orgId: string) {
  const license = await prisma.orgLicense.findUnique({
    where: { orgId },
    select: {
      status: true,
      billingCycle: true,
      stationLimit: true,
      currency: true,
    },
  });

  const billableCount = await prisma.wifiStation.count({
    where: { orgId, deletedAt: null, status: 'ACTIVE' },
  });

  if (!license) {
    return {
      hasLicense: false,
      stationLimit: 0,
      billableCount,
      remainingSlots: 0,
      usagePercent: 0,
      isAtLimit: false,
      isNearLimit: false,
      status: null,
      billingCycle: null,
      currency: null,
    };
  }

  const usagePercent =
    license.stationLimit > 0
      ? Math.min(100, Math.round((billableCount / license.stationLimit) * 100))
      : 0;

  return {
    hasLicense: true,
    stationLimit: license.stationLimit,
    billableCount,
    remainingSlots: Math.max(0, license.stationLimit - billableCount),
    usagePercent,
    isAtLimit: billableCount >= license.stationLimit,
    isNearLimit: usagePercent >= 85 && billableCount < license.stationLimit,
    status: license.status,
    billingCycle: license.billingCycle,
    currency: license.currency,
  };
}

async function assertLicenseCapacity(
  prisma: PrismaClient,
  orgId: string,
  nextStatus: StationStatus,
  previousStatus?: StationStatus,
  stationId?: string
): Promise<string | null> {
  const wasBillable = previousStatus === 'ACTIVE';
  const willBeBillable = nextStatus === 'ACTIVE';
  if (!willBeBillable || wasBillable) return null;

  const license = await prisma.orgLicense.findUnique({
    where: { orgId },
    select: { stationLimit: true },
  });

  if (!license) {
    return 'This organization does not have a subscription. Cannot add active sites.';
  }

  const activeCount = await prisma.wifiStation.count({
    where: {
      orgId,
      deletedAt: null,
      status: 'ACTIVE',
      ...(stationId ? { id: { not: stationId } } : {}),
    },
  });

  if (activeCount >= license.stationLimit) {
    return `Licensed site limit reached (${license.stationLimit}). Deactivate another site or increase the subscription limit.`;
  }

  return null;
}

async function validateStationSize(
  prisma: PrismaClient,
  stationSizeId: string
): Promise<string | null> {
  const tier = await prisma.stationSize.findFirst({
    where: { id: stationSizeId, isActive: true },
    select: { id: true },
  });
  if (!tier) {
    return 'Selected capacity tier is invalid or inactive.';
  }
  return null;
}

async function validateVendorProfile(
  prisma: PrismaClient,
  orgId: string,
  profileId: string | null | undefined
): Promise<string | null> {
  if (!profileId) return null;
  const profile = await prisma.radiusVendorProfile.findFirst({
    where: { id: profileId, orgId, deletedAt: null },
    select: { id: true },
  });
  if (!profile) return 'Selected RADIUS vendor profile was not found for this organization.';
  return null;
}

/** menus.wifi.sites.directory @route /wifi/sites */
export class SitesController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const adminId = req.userId!;
      const isDeveloper = isDeveloperAdmin(req.user!);

      if (req.query.formOptions === 'true') {
        let orgId: string | undefined;
        const orgIdParam = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
        if (orgIdParam) {
          orgId = orgIdParam;
        } else {
          try {
            orgId = await resolveOrgFromRequest(this.prisma, req);
          } catch {
            orgId = undefined;
          }
        }

        const [memberships, stationSizes, vendorProfiles] = await Promise.all([
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
          this.prisma.stationSize.findMany({
            where: { isActive: true },
            select: { id: true, code: true, name: true, sortOrder: true, description: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          }),
          orgId
            ? this.prisma.radiusVendorProfile.findMany({
                where: { orgId, deletedAt: null },
                select: { id: true, name: true, vendor: true, model: true },
                orderBy: { name: 'asc' },
              })
            : Promise.resolve([]),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: { memberships, stationSizes, vendorProfiles },
        });
      }

      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
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
        return responseError(res, status, { code, message });
      }

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const idParam = req.params.id as string | string[];
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        const row = await this.prisma.wifiStation.findFirst({
          where: { id, orgId, deletedAt: null },
          select: stationSelect,
        });

        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Site not found.',
          });
        }

        return responseSuccess(res, { message: 'Success', data: serializeStation(row) });
      }

      const where = buildListWhere(orgId, req.query);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, activeCount, maintenanceCount, disabledCount, licenseMeta, memberships] =
        await Promise.all([
          this.prisma.wifiStation.findMany({
            where,
            select: stationSelect,
            orderBy: [{ status: 'asc' }, { name: 'asc' }],
            skip,
            take,
          }),
          this.prisma.wifiStation.count({ where }),
          this.prisma.wifiStation.count({
            where: { orgId, deletedAt: null, status: 'ACTIVE' },
          }),
          this.prisma.wifiStation.count({
            where: { orgId, deletedAt: null, status: 'MAINTENANCE' },
          }),
          this.prisma.wifiStation.count({
            where: { orgId, deletedAt: null, status: 'DISABLED' },
          }),
          loadLicenseMeta(this.prisma, orgId),
          loadOrgMembershipOptions(this.prisma, adminId, isDeveloper),
        ]);

      responseSuccess(res, {
        message: 'Success',
        data: rows.map(serializeStation),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          activeCount,
          maintenanceCount,
          disabledCount,
          license: licenseMeta,
          memberships,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');

      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const { error, value } = (isUpdate ? SitesUpdateSchema : SitesCreateSchema).validate(
        req.body,
        { abortEarly: false, allowUnknown: false }
      );

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (isUpdate) {
        const existing = await this.prisma.wifiStation.findFirst({
          where: { id: recordId!, orgId, deletedAt: null },
          select: { id: true, code: true, status: true, stationSizeId: true },
        });

        if (!existing) {
          return responseError(res, 404, { code: 'NOT_FOUND', message: 'Site not found.' });
        }

        const nextStatus = (value.status ?? existing.status) as StationStatus;
        const licenseError = await assertLicenseCapacity(
          this.prisma,
          orgId,
          nextStatus,
          existing.status as StationStatus,
          existing.id
        );
        if (licenseError) {
          return responseError(res, 409, { code: 'LICENSE_LIMIT', message: licenseError });
        }

        if (value.stationSizeId) {
          const tierError = await validateStationSize(this.prisma, value.stationSizeId);
          if (tierError) {
            return responseError(res, 400, { code: 'VALIDATION_ERROR', message: tierError });
          }
        }

        const vendorError = await validateVendorProfile(
          this.prisma,
          orgId,
          value.radiusVendorProfileId
        );
        if (vendorError) {
          return responseError(res, 400, { code: 'VALIDATION_ERROR', message: vendorError });
        }

        if (value.code && value.code !== existing.code) {
          const duplicate = await this.prisma.wifiStation.findFirst({
            where: { orgId, code: value.code, deletedAt: null, id: { not: recordId! } },
            select: { id: true },
          });
          if (duplicate) {
            return responseError(res, 409, {
              code: 'CODE_EXISTS',
              message: orgScopedCodeTakenMessage('Site code', value.code),
            });
          }
        }

        const updated = await this.prisma.wifiStation.update({
          where: { id: recordId! },
          data: {
            ...(value.code !== undefined ? { code: value.code } : {}),
            ...(value.name !== undefined ? { name: value.name } : {}),
            ...(value.location !== undefined
              ? { location: value.location || null }
              : {}),
            ...(value.township !== undefined
              ? { township: value.township || null }
              : {}),
            ...(value.address !== undefined ? { address: value.address || null } : {}),
            ...(value.stationSizeId !== undefined
              ? { stationSizeId: value.stationSizeId }
              : {}),
            ...(value.status !== undefined ? { status: value.status } : {}),
            ...(value.portalBaseUrl !== undefined
              ? { portalBaseUrl: value.portalBaseUrl || null }
              : {}),
            ...(value.nasIdentifier !== undefined
              ? { nasIdentifier: value.nasIdentifier || null }
              : {}),
            ...(value.radiusClientIp !== undefined
              ? { radiusClientIp: value.radiusClientIp || null }
              : {}),
            ...(value.radiusSecret !== undefined
              ? { radiusSecret: value.radiusSecret || null }
              : {}),
            ...(value.vlanId !== undefined ? { vlanId: value.vlanId || null } : {}),
            ...(value.radiusVendorProfileId !== undefined
              ? { radiusVendorProfileId: value.radiusVendorProfileId }
              : {}),
          },
          select: stationSelect,
        });

        return responseSuccess(res, {
          message: 'Site updated',
          data: serializeStation(updated),
        });
      }

      const tierError = await validateStationSize(this.prisma, value.stationSizeId);
      if (tierError) {
        return responseError(res, 400, { code: 'VALIDATION_ERROR', message: tierError });
      }

      const vendorError = await validateVendorProfile(
        this.prisma,
        orgId,
        value.radiusVendorProfileId
      );
      if (vendorError) {
        return responseError(res, 400, { code: 'VALIDATION_ERROR', message: vendorError });
      }

      const licenseError = await assertLicenseCapacity(
        this.prisma,
        orgId,
        (value.status ?? 'ACTIVE') as StationStatus
      );
      if (licenseError) {
        return responseError(res, 409, { code: 'LICENSE_LIMIT', message: licenseError });
      }

      const duplicate = await this.prisma.wifiStation.findFirst({
        where: { orgId, code: value.code, deletedAt: null },
        select: { id: true },
      });
      if (duplicate) {
        return responseError(res, 409, {
          code: 'CODE_EXISTS',
          message: orgScopedCodeTakenMessage('Site code', value.code),
        });
      }

      const created = await this.prisma.wifiStation.create({
        data: {
          orgId,
          code: value.code,
          name: value.name,
          location: value.location || null,
          township: value.township || null,
          address: value.address || null,
          stationSizeId: value.stationSizeId,
          status: value.status ?? 'ACTIVE',
          portalBaseUrl: value.portalBaseUrl || null,
          nasIdentifier: value.nasIdentifier || null,
          radiusClientIp: value.radiusClientIp || null,
          radiusSecret: value.radiusSecret || null,
          vlanId: value.vlanId || null,
          radiusVendorProfileId: value.radiusVendorProfileId ?? null,
        },
        select: stationSelect,
      });

      return responseSuccess(res, {
        status: 201,
        message: 'Site created',
        data: serializeStation(created),
      });
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      let orgId: string;
      try {
        orgId = await resolveOrgFromRequest(this.prisma, req);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Organization context is required.';
        return responseError(res, 400, { code: 'ORG_REQUIRED', message });
      }

      const idParam = req.params.id as string | string[];
      const id = Array.isArray(idParam) ? idParam[0] : idParam;

      const existing = await this.prisma.wifiStation.findFirst({
        where: { id, orgId, deletedAt: null },
        select: {
          id: true,
          _count: { select: { credentials: true, sales: true } },
        },
      });

      if (!existing) {
        return responseError(res, 404, { code: 'NOT_FOUND', message: 'Site not found.' });
      }

      if (existing._count.credentials > 0 || existing._count.sales > 0) {
        return responseError(res, 409, {
          code: 'SITE_IN_USE',
          message:
            'This site is referenced by credentials or sales. Set status to DISABLED instead of deleting.',
        });
      }

      await this.prisma.wifiStation.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'DISABLED' },
      });

      responseSuccess(res, { message: 'Site removed', data: { id } });
    }),
  ];
}
