import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { BillingSubscriptionUpdateSchema } from './schema';

const licenseSelect = {
  id: true,
  orgId: true,
  status: true,
  billingCycle: true,
  stationLimit: true,
  currentActiveStationCount: true,
  currency: true,
  effectiveFrom: true,
  expiresAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  org: {
    select: {
      id: true,
      code: true,
      name: true,
      currency: true,
      isActive: true,
      timezone: true,
    },
  },
} satisfies Prisma.OrgLicenseSelect;

type LicenseRow = Prisma.OrgLicenseGetPayload<{ select: typeof licenseSelect }>;

async function countBillableStations(
  prisma: PrismaClient,
  orgId: string
): Promise<number> {
  return prisma.wifiStation.count({
    where: {
      orgId,
      deletedAt: null,
      status: 'ACTIVE',
    },
  });
}

async function stationUsageByTier(prisma: PrismaClient, orgId: string) {
  const rows = await prisma.wifiStation.groupBy({
    by: ['stationSizeId'],
    where: { orgId, deletedAt: null, status: 'ACTIVE' },
    _count: { _all: true },
  });

  if (!rows.length) return [];

  const tiers = await prisma.stationSize.findMany({
    where: { id: { in: rows.map((r) => r.stationSizeId) } },
    select: { id: true, code: true, name: true, sortOrder: true },
    orderBy: [{ sortOrder: 'asc' }],
  });

  const tierMap = new Map(tiers.map((t) => [t.id, t]));
  return rows
    .map((row) => ({
      stationSize: tierMap.get(row.stationSizeId) ?? {
        id: row.stationSizeId,
        code: '—',
        name: 'Unknown',
        sortOrder: 999,
      },
      count: row._count._all,
    }))
    .sort((a, b) => a.stationSize.sortOrder - b.stationSize.sortOrder);
}

function enrichLicense(license: LicenseRow, activeStationCount: number) {
  const usagePercent =
    license.stationLimit > 0
      ? Math.min(100, Math.round((activeStationCount / license.stationLimit) * 100))
      : 0;
  const isNearLimit = usagePercent >= 85;
  const isAtLimit = activeStationCount >= license.stationLimit;

  return {
    ...license,
    activeStationCount,
    usagePercent,
    isNearLimit,
    isAtLimit,
    remainingSlots: Math.max(0, license.stationLimit - activeStationCount),
  };
}

/** menus.wifi.billing.subscription @route /wifi/billing/subscription */
export class BillingSubscriptionController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const orgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';

      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const license = await this.prisma.orgLicense.findUnique({
          where: { id: req.params.id },
          select: licenseSelect,
        });
        if (!license) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Subscription not found.',
          });
        }

        const activeStationCount = await countBillableStations(this.prisma, license.orgId);
        const [usageByTier, recentHistory, overrideCount, invoiceSummary] = await Promise.all([
          stationUsageByTier(this.prisma, license.orgId),
          this.prisma.orgLicenseHistory.findMany({
            where: { licenseId: license.id },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
              id: true,
              changeType: true,
              previousStationLimit: true,
              newStationLimit: true,
              previousStatus: true,
              newStatus: true,
              effectiveFrom: true,
              reason: true,
              createdAt: true,
              changedByAdmin: { select: { id: true, fullName: true, username: true } },
            },
          }),
          this.prisma.orgLicenseStationSizePrice.count({
            where: { orgId: license.orgId, isActive: true },
          }),
          this.prisma.orgInvoice.groupBy({
            by: ['status'],
            where: { orgId: license.orgId },
            _count: { _all: true },
          }),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: {
            license: enrichLicense(license, activeStationCount),
            usageByTier,
            recentHistory,
            overrideCount,
            invoiceSummary: invoiceSummary.map((row) => ({
              status: row.status,
              count: row._count._all,
            })),
          },
        });
      }

      if (orgId) {
        const license = await this.prisma.orgLicense.findUnique({
          where: { orgId },
          select: licenseSelect,
        });
        if (!license) {
          return responseError(res, 404, {
            code: 'NO_SUBSCRIPTION',
            message: 'This organization does not have an active subscription record.',
          });
        }

        const activeStationCount = await countBillableStations(this.prisma, license.orgId);
        const [usageByTier, recentHistory, overrideCount, invoiceSummary] = await Promise.all([
          stationUsageByTier(this.prisma, license.orgId),
          this.prisma.orgLicenseHistory.findMany({
            where: { licenseId: license.id },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
              id: true,
              changeType: true,
              previousStationLimit: true,
              newStationLimit: true,
              previousStatus: true,
              newStatus: true,
              effectiveFrom: true,
              reason: true,
              createdAt: true,
              changedByAdmin: { select: { id: true, fullName: true, username: true } },
            },
          }),
          this.prisma.orgLicenseStationSizePrice.count({
            where: { orgId: license.orgId, isActive: true },
          }),
          this.prisma.orgInvoice.groupBy({
            by: ['status'],
            where: { orgId: license.orgId },
            _count: { _all: true },
          }),
        ]);

        return responseSuccess(res, {
          message: 'Success',
          data: {
            license: enrichLicense(license, activeStationCount),
            usageByTier,
            recentHistory,
            overrideCount,
            invoiceSummary: invoiceSummary.map((row) => ({
              status: row.status,
              count: row._count._all,
            })),
          },
        });
      }

      const licenses = await this.prisma.orgLicense.findMany({
        select: licenseSelect,
        orderBy: { org: { name: 'asc' } },
      });

      const enriched = await Promise.all(
        licenses.map(async (license) => {
          const activeStationCount = await countBillableStations(this.prisma, license.orgId);
          return enrichLicense(license, activeStationCount);
        })
      );

      const statusCounts = enriched.reduce(
        (acc, row) => {
          acc[row.status] = (acc[row.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      responseSuccess(res, {
        message: 'Success',
        data: { subscriptions: enriched },
        meta: {
          total: enriched.length,
          activeCount: statusCounts.ACTIVE ?? 0,
          suspendedCount: statusCounts.SUSPENDED ?? 0,
          nearLimitCount: enriched.filter((r) => r.isNearLimit).length,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const licenseId = (req.params?.id as string) ?? null;
      if (!licenseId || licenseId === 'all') {
        return responseError(res, 400, {
          code: 'LICENSE_ID_REQUIRED',
          message: 'Subscription license id is required for updates.',
        });
      }

      const { error, value } = BillingSubscriptionUpdateSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const existing = await this.prisma.orgLicense.findUnique({
        where: { id: licenseId },
      });
      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Subscription not found.',
        });
      }

      const actorAdminId = req.userId as string;
      const activeStationCount = await countBillableStations(this.prisma, existing.orgId);

      if (value.stationLimit !== undefined && value.stationLimit < activeStationCount) {
        return responseError(res, 409, {
          code: 'LIMIT_BELOW_USAGE',
          message: `Station limit cannot be below current active sites (${activeStationCount}).`,
        });
      }

      let changeType: 'STATION_LIMIT_CHANGE' | 'STATUS_CHANGE' | 'OTHER' = 'OTHER';
      if (value.stationLimit !== undefined && value.stationLimit !== existing.stationLimit) {
        changeType = 'STATION_LIMIT_CHANGE';
      } else if (value.status !== undefined && value.status !== existing.status) {
        changeType = 'STATUS_CHANGE';
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        const license = await tx.orgLicense.update({
          where: { id: licenseId },
          data: {
            ...(value.stationLimit !== undefined ? { stationLimit: value.stationLimit } : {}),
            ...(value.status !== undefined ? { status: value.status } : {}),
            ...(value.expiresAt !== undefined
              ? { expiresAt: value.expiresAt ? new Date(value.expiresAt) : null }
              : {}),
            ...(value.notes !== undefined ? { notes: value.notes || null } : {}),
            currentActiveStationCount: activeStationCount,
          },
          select: licenseSelect,
        });

        const hasMaterialChange =
          (value.stationLimit !== undefined && value.stationLimit !== existing.stationLimit) ||
          (value.status !== undefined && value.status !== existing.status);

        if (hasMaterialChange || value.reason) {
          await tx.orgLicenseHistory.create({
            data: {
              orgId: existing.orgId,
              licenseId: existing.id,
              changeType,
              previousStationLimit: existing.stationLimit,
              newStationLimit: value.stationLimit ?? existing.stationLimit,
              previousStatus: existing.status,
              newStatus: value.status ?? existing.status,
              effectiveFrom: new Date(),
              reason: value.reason?.trim() || 'Subscription updated',
              changedByAdminId: actorAdminId,
            },
          });
        }

        return license;
      });

      responseSuccess(res, {
        message: 'Subscription updated',
        data: enrichLicense(updated, activeStationCount),
      });
    }),
  ];

  public remove = [
    asyncController(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
      responseError(res, 405, {
        code: 'NOT_ALLOWED',
        message: 'Subscriptions cannot be deleted. Set status to CANCELLED instead.',
      });
    }),
  ];
}
