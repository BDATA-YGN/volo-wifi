import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';

const orgSummarySelect = {
  id: true,
  code: true,
  name: true,
  currency: true,
  isActive: true,
} satisfies Prisma.OrgSelect;

const licenseSummarySelect = {
  id: true,
  status: true,
  billingCycle: true,
  stationLimit: true,
  effectiveFrom: true,
} satisfies Prisma.OrgLicenseSelect;

const historySelect = {
  id: true,
  orgId: true,
  licenseId: true,
  changeType: true,
  previousStationLimit: true,
  newStationLimit: true,
  stationSizeId: true,
  previousUnitPrice: true,
  newUnitPrice: true,
  previousStatus: true,
  newStatus: true,
  effectiveFrom: true,
  reason: true,
  createdAt: true,
  stationSize: {
    select: { id: true, code: true, name: true, sortOrder: true },
  },
  changedByAdmin: {
    select: { id: true, fullName: true, username: true },
  },
} satisfies Prisma.OrgLicenseHistorySelect;

type HistoryRow = Prisma.OrgLicenseHistoryGetPayload<{ select: typeof historySelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

function mapHistoryRow(row: HistoryRow) {
  return {
    ...row,
    previousUnitPrice: decimalToString(row.previousUnitPrice),
    newUnitPrice: decimalToString(row.newUnitPrice),
  };
}

function buildHistoryWhere(
  orgId: string,
  query: AuthenticatedRequest['query']
): Prisma.OrgLicenseHistoryWhereInput {
  const changeType =
    typeof query.changeType === 'string' ? query.changeType.trim().toUpperCase() : '';
  const tierCode =
    typeof query.tierCode === 'string' ? query.tierCode.trim().toUpperCase() : '';
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  const where: Prisma.OrgLicenseHistoryWhereInput = { orgId };

  if (changeType) {
    where.changeType = changeType as Prisma.EnumLicenseChangeTypeFilter['equals'];
  }

  if (tierCode) {
    where.stationSize = { code: tierCode };
  }

  if (search) {
    where.OR = [
      { reason: { contains: search, mode: 'insensitive' } },
      { changedByAdmin: { fullName: { contains: search, mode: 'insensitive' } } },
      { changedByAdmin: { username: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

/** menus.wifi.billing.subscription.changelog @route /wifi/billing/subscription/changelog */
export class BillingSubscriptionChangelogController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const entry = await this.prisma.orgLicenseHistory.findUnique({
          where: { id: req.params.id },
          select: {
            ...historySelect,
            org: { select: orgSummarySelect },
            license: { select: licenseSummarySelect },
          },
        });

        if (!entry) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Changelog entry not found.',
          });
        }

        return responseSuccess(res, {
          message: 'Success',
          data: mapHistoryRow(entry),
        });
      }

      const orgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';

      if (!orgId) {
        const licenses = await this.prisma.orgLicense.findMany({
          select: {
            ...licenseSummarySelect,
            orgId: true,
            org: { select: orgSummarySelect },
          },
          orderBy: { org: { name: 'asc' } },
        });

        const orgs = await Promise.all(
          licenses.map(async (license) => {
            const [historyCount, lastEntry] = await Promise.all([
              this.prisma.orgLicenseHistory.count({ where: { orgId: license.orgId } }),
              this.prisma.orgLicenseHistory.findFirst({
                where: { orgId: license.orgId },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true, changeType: true },
              }),
            ]);

            return {
              org: license.org,
              license: {
                id: license.id,
                status: license.status,
                billingCycle: license.billingCycle,
                stationLimit: license.stationLimit,
                effectiveFrom: license.effectiveFrom,
              },
              historyCount,
              lastChangeAt: lastEntry?.createdAt ?? null,
              lastChangeType: lastEntry?.changeType ?? null,
            };
          })
        );

        const totalEntries = orgs.reduce((sum, row) => sum + row.historyCount, 0);

        return responseSuccess(res, {
          message: 'Success',
          data: { orgs },
          meta: {
            orgCount: orgs.length,
            totalEntries,
            orgsWithHistory: orgs.filter((o) => o.historyCount > 0).length,
          },
        });
      }

      const license = await this.prisma.orgLicense.findUnique({
        where: { orgId },
        select: {
          ...licenseSummarySelect,
          org: { select: orgSummarySelect },
        },
      });

      if (!license) {
        return responseError(res, 404, {
          code: 'NO_SUBSCRIPTION',
          message: 'This organization does not have a subscription record.',
        });
      }

      const where = buildHistoryWhere(orgId, req.query);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, typeGroups, availableTiers] = await Promise.all([
        this.prisma.orgLicenseHistory.findMany({
          where,
          select: historySelect,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.orgLicenseHistory.count({ where }),
        this.prisma.orgLicenseHistory.groupBy({
          by: ['changeType'],
          where: { orgId },
          _count: { _all: true },
        }),
        this.prisma.stationSize.findMany({
          where: { isActive: true },
          select: { id: true, code: true, name: true, sortOrder: true },
          orderBy: [{ sortOrder: 'asc' }],
        }),
      ]);

      const countsByChangeType = Object.fromEntries(
        typeGroups.map((row) => [row.changeType, row._count._all])
      );

      responseSuccess(res, {
        message: 'Success',
        data: {
          org: license.org,
          license: {
            id: license.id,
            status: license.status,
            billingCycle: license.billingCycle,
            stationLimit: license.stationLimit,
            effectiveFrom: license.effectiveFrom,
          },
          entries: rows.map(mapHistoryRow),
          availableTiers,
        },
        meta: {
          total,
          page,
          limit,
          pages: Math.max(1, Math.ceil(total / limit)),
          countsByChangeType,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
      responseError(res, 405, {
        code: 'READ_ONLY',
        message: 'Subscription changelog is append-only and cannot be edited from this screen.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
      responseError(res, 405, {
        code: 'READ_ONLY',
        message: 'Subscription changelog entries cannot be deleted.',
      });
    }),
  ];
}
