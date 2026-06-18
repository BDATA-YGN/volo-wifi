import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { TenantsUpdateSchema } from './schema';

const licenseBriefSelect = {
  id: true,
  status: true,
  billingCycle: true,
  stationLimit: true,
  currentActiveStationCount: true,
  currency: true,
  effectiveFrom: true,
  expiresAt: true,
} satisfies Prisma.OrgLicenseSelect;

const orgListSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  timezone: true,
  currency: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  orgLicense: { select: licenseBriefSelect },
} satisfies Prisma.OrgSelect;

const orgDetailSelect = {
  ...orgListSelect,
  stationCodePrefix: true,
  planCodePrefix: true,
  resellerCodePrefix: true,
  enableAnnouncement: true,
  announcement: true,
  adminId: true,
} satisfies Prisma.OrgSelect;

type OrgListRow = Prisma.OrgGetPayload<{ select: typeof orgListSelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

async function countActiveStations(prisma: PrismaClient, orgId: string): Promise<number> {
  return prisma.wifiStation.count({
    where: { orgId, deletedAt: null, status: 'ACTIVE' },
  });
}

function enrichTenantRow(
  org: OrgListRow,
  activeStationCount: number,
  memberCount: number,
  totalStationCount: number
) {
  const license = org.orgLicense;
  const stationLimit = license?.stationLimit ?? 0;
  const usagePercent =
    license && stationLimit > 0
      ? Math.min(100, Math.round((activeStationCount / stationLimit) * 100))
      : 0;

  return {
    ...org,
    activeStationCount,
    totalStationCount,
    memberCount,
    usagePercent,
    isNearLimit: Boolean(license && usagePercent >= 85),
    isAtLimit: Boolean(license && activeStationCount >= stationLimit),
    remainingSlots: license ? Math.max(0, stationLimit - activeStationCount) : null,
    hasLicense: Boolean(license),
  };
}

function buildWhere(query: AuthenticatedRequest['query']): Prisma.OrgWhereInput {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const isActive = typeof query.isActive === 'string' ? query.isActive.trim() : '';
  const licenseStatus =
    typeof query.licenseStatus === 'string' ? query.licenseStatus.trim().toUpperCase() : '';
  const hasLicense = typeof query.hasLicense === 'string' ? query.hasLicense.trim() : '';

  const where: Prisma.OrgWhereInput = { deletedAt: null };

  if (isActive === 'true') where.isActive = true;
  if (isActive === 'false') where.isActive = false;

  if (hasLicense === 'true') where.orgLicense = { isNot: null };
  if (hasLicense === 'false') where.orgLicense = { is: null };

  if (licenseStatus) {
    where.orgLicense = { status: licenseStatus as Prisma.EnumOrgLicenseStatusFilter['equals'] };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

/** menus.wifi.tenant.directory @route /wifi/tenants */
export class TenantsController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const idParam = req.params.id as string | string[];
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        const org = await this.prisma.org.findFirst({
          where: { id, deletedAt: null },
          select: orgDetailSelect,
        });

        if (!org) {
          return responseError(res, 404, { code: 'NOT_FOUND', message: 'Tenant not found.' });
        }

        const [activeStationCount, totalStationCount, memberCount, planCount, resellerCount] =
          await Promise.all([
            countActiveStations(this.prisma, org.id),
            this.prisma.wifiStation.count({ where: { orgId: org.id, deletedAt: null } }),
            this.prisma.orgMember.count({ where: { orgId: org.id, deletedAt: null } }),
            this.prisma.plan.count({ where: { orgId: org.id, deletedAt: null } }),
            this.prisma.reseller.count({ where: { orgId: org.id, deletedAt: null } }),
          ]);

        return responseSuccess(res, {
          message: 'Success',
          data: enrichTenantRow(org, activeStationCount, memberCount, totalStationCount),
          meta: { planCount, resellerCount },
        });
      }

      const where = buildWhere(req.query);
      const { page, limit, skip, take } = parsePagination(req.query);

      const licenseScopeWhere: Prisma.OrgWhereInput = {
        ...where,
        orgLicense: { isNot: null },
      };

      const [orgs, total, activeOrgCount, withLicenseCount, licensedOrgs] = await Promise.all([
        this.prisma.org.findMany({
          where,
          select: orgListSelect,
          orderBy: { name: 'asc' },
          skip,
          take,
        }),
        this.prisma.org.count({ where }),
        this.prisma.org.count({ where: { ...where, isActive: true } }),
        this.prisma.org.count({ where: licenseScopeWhere }),
        this.prisma.org.findMany({
          where: licenseScopeWhere,
          select: {
            id: true,
            orgLicense: { select: { stationLimit: true } },
          },
        }),
      ]);

      const enriched = await Promise.all(
        orgs.map(async (org) => {
          const [activeStationCount, memberCount, totalStationCount] = await Promise.all([
            countActiveStations(this.prisma, org.id),
            this.prisma.orgMember.count({ where: { orgId: org.id, deletedAt: null } }),
            this.prisma.wifiStation.count({ where: { orgId: org.id, deletedAt: null } }),
          ]);
          return enrichTenantRow(org, activeStationCount, memberCount, totalStationCount);
        })
      );

      let nearLimitCount = 0;
      if (licensedOrgs.length) {
        const licensedIds = licensedOrgs.map((org) => org.id);
        const activeByOrg = await this.prisma.wifiStation.groupBy({
          by: ['orgId'],
          where: {
            orgId: { in: licensedIds },
            deletedAt: null,
            status: 'ACTIVE',
          },
          _count: { _all: true },
        });
        const activeMap = new Map(activeByOrg.map((row) => [row.orgId, row._count._all]));
        nearLimitCount = licensedOrgs.filter((org) => {
          const limit = org.orgLicense?.stationLimit ?? 0;
          if (limit <= 0) return false;
          const active = activeMap.get(org.id) ?? 0;
          return active / limit >= 0.85;
        }).length;
      }

      const licenseStatusCounts = enriched.reduce(
        (acc, row) => {
          const status = row.orgLicense?.status;
          if (status) acc[status] = (acc[status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      responseSuccess(res, {
        message: 'Success',
        data: enriched,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          activeOrgCount,
          withLicenseCount,
          nearLimitCount,
          licenseStatusCounts,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');

      if (!isUpdate) {
        return responseError(res, 400, {
          code: 'USE_REGISTRATION',
          message: 'New tenants are created via Tenant Registration.',
        });
      }

      const { error, value } = TenantsUpdateSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const existing = await this.prisma.org.findFirst({
        where: { id: recordId!, deletedAt: null },
        select: { id: true },
      });

      if (!existing) {
        return responseError(res, 404, { code: 'NOT_FOUND', message: 'Tenant not found.' });
      }

      const updated = await this.prisma.org.update({
        where: { id: recordId! },
        data: {
          ...(value.name !== undefined && { name: value.name }),
          ...(value.description !== undefined && {
            description: value.description || null,
          }),
          ...(value.isActive !== undefined && { isActive: value.isActive }),
          ...(value.timezone !== undefined && { timezone: value.timezone }),
          ...(value.currency !== undefined && { currency: value.currency }),
          ...(value.enableAnnouncement !== undefined && {
            enableAnnouncement: value.enableAnnouncement,
          }),
          ...(value.announcement !== undefined && {
            announcement: value.announcement || null,
          }),
        },
        select: orgDetailSelect,
      });

      const [activeStationCount, totalStationCount, memberCount] = await Promise.all([
        countActiveStations(this.prisma, updated.id),
        this.prisma.wifiStation.count({ where: { orgId: updated.id, deletedAt: null } }),
        this.prisma.orgMember.count({ where: { orgId: updated.id, deletedAt: null } }),
      ]);

      responseSuccess(res, {
        message: 'Tenant updated',
        data: enrichTenantRow(updated, activeStationCount, memberCount, totalStationCount),
      });
    }),
  ];

  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 405, {
        code: 'DEACTIVATE_INSTEAD',
        message: 'Tenants cannot be deleted from the directory. Deactivate the tenant instead.',
      });
    }),
  ];
}
