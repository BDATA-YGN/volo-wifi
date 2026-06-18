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
} satisfies Prisma.OrgLicenseSelect;

const stationSelect = {
  id: true,
  code: true,
  name: true,
  location: true,
  address: true,
  status: true,
  createdAt: true,
  stationSizeId: true,
  stationSize: {
    select: { id: true, code: true, name: true, sortOrder: true },
  },
} satisfies Prisma.WifiStationSelect;

const platformPriceSelect = {
  stationSizeId: true,
  billingCycle: true,
  unitPrice: true,
  currency: true,
  effectiveFrom: true,
  effectiveTo: true,
  isActive: true,
} satisfies Prisma.StationLicensePriceSelect;

const tenantPriceSelect = {
  stationSizeId: true,
  billingCycle: true,
  unitPrice: true,
  currency: true,
  effectiveFrom: true,
  effectiveTo: true,
  isActive: true,
} satisfies Prisma.OrgLicenseStationSizePriceSelect;

type StationRow = Prisma.WifiStationGetPayload<{ select: typeof stationSelect }>;

function isRateEffective(
  price: { isActive: boolean; effectiveFrom: Date; effectiveTo: Date | null },
  at: Date
): boolean {
  if (!price.isActive) return false;
  if (price.effectiveFrom > at) return false;
  if (price.effectiveTo && price.effectiveTo <= at) return false;
  return true;
}

function resolveCurrentRate<T extends { effectiveFrom: Date; isActive: boolean; effectiveTo: Date | null }>(
  prices: T[],
  at: Date
): T | null {
  return (
    prices
      .filter((p) => isRateEffective(p, at))
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0] ?? null
  );
}

function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

function multiplyDecimal(price: string | null, count: number): string | null {
  if (!price || count <= 0) return null;
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  return (n * count).toFixed(2);
}

function enrichLicense(
  license: Prisma.OrgLicenseGetPayload<{ select: typeof licenseSelect }>,
  billableCount: number
) {
  const usagePercent =
    license.stationLimit > 0
      ? Math.min(100, Math.round((billableCount / license.stationLimit) * 100))
      : 0;

  return {
    ...license,
    billableCount,
    usagePercent,
    isNearLimit: usagePercent >= 85,
    isAtLimit: billableCount >= license.stationLimit,
    remainingSlots: Math.max(0, license.stationLimit - billableCount),
  };
}

function mapStation(row: StationRow) {
  const isBillable = row.status === 'ACTIVE';
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    location: row.location,
    address: row.address,
    status: row.status,
    isBillable,
    createdAt: row.createdAt,
    stationSize: row.stationSize,
  };
}

/** menus.wifi.billing.subscription.sites @route /wifi/billing/subscription/sites */
export class BillingSubscriptionSitesController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  private async loadPricingMaps(orgId: string, billingCycle: 'MONTHLY', at: Date) {
    const [platformPrices, tenantPrices] = await Promise.all([
      this.prisma.stationLicensePrice.findMany({
        where: { billingCycle, isActive: true },
        select: platformPriceSelect,
        orderBy: { effectiveFrom: 'desc' },
      }),
      this.prisma.orgLicenseStationSizePrice.findMany({
        where: { orgId, billingCycle, isActive: true },
        select: tenantPriceSelect,
        orderBy: { effectiveFrom: 'desc' },
      }),
    ]);

    const platformByTier = new Map<string, typeof platformPrices>();
    for (const row of platformPrices) {
      const bucket = platformByTier.get(row.stationSizeId) ?? [];
      bucket.push(row);
      platformByTier.set(row.stationSizeId, bucket);
    }

    const tenantByTier = new Map<string, typeof tenantPrices>();
    for (const row of tenantPrices) {
      const bucket = tenantByTier.get(row.stationSizeId) ?? [];
      bucket.push(row);
      tenantByTier.set(row.stationSizeId, bucket);
    }

    return { platformByTier, tenantByTier };
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Licensed site not found.',
        });
      }

      const orgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const tierCode =
        typeof req.query.tierCode === 'string' ? req.query.tierCode.trim().toUpperCase() : '';
      const billableOnly = req.query.billableOnly !== 'false';

      if (!orgId) {
        const licenses = await this.prisma.orgLicense.findMany({
          select: {
            ...licenseSelect,
            org: { select: orgSummarySelect },
          },
          orderBy: { org: { name: 'asc' } },
        });

        const orgs = await Promise.all(
          licenses.map(async (license) => {
            const billableCount = await this.prisma.wifiStation.count({
              where: { orgId: license.orgId, deletedAt: null, status: 'ACTIVE' },
            });
            return {
              org: license.org,
              license: enrichLicense(license, billableCount),
            };
          })
        );

        const totalBillable = orgs.reduce((sum, row) => sum + row.license.billableCount, 0);

        return responseSuccess(res, {
          message: 'Success',
          data: { orgs },
          meta: {
            orgCount: orgs.length,
            totalBillable,
          },
        });
      }

      const license = await this.prisma.orgLicense.findUnique({
        where: { orgId },
        select: { ...licenseSelect, org: { select: orgSummarySelect } },
      });

      if (!license) {
        return responseError(res, 404, {
          code: 'NO_SUBSCRIPTION',
          message: 'This organization does not have a subscription record.',
        });
      }

      const stationWhere: Prisma.WifiStationWhereInput = {
        orgId,
        deletedAt: null,
        ...(billableOnly ? { status: 'ACTIVE' } : {}),
        ...(tierCode ? { stationSize: { code: tierCode } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const [stations, billableCount, inactiveCount, allTiers] = await Promise.all([
        this.prisma.wifiStation.findMany({
          where: stationWhere,
          select: stationSelect,
          orderBy: [{ stationSize: { sortOrder: 'asc' } }, { code: 'asc' }],
        }),
        this.prisma.wifiStation.count({
          where: { orgId, deletedAt: null, status: 'ACTIVE' },
        }),
        this.prisma.wifiStation.count({
          where: { orgId, deletedAt: null, status: { not: 'ACTIVE' } },
        }),
        this.prisma.stationSize.findMany({
          where: { isActive: true },
          select: { id: true, code: true, name: true, sortOrder: true },
          orderBy: [{ sortOrder: 'asc' }],
        }),
      ]);

      const at = new Date();
      const billingCycle = (license.billingCycle as 'MONTHLY') ?? 'MONTHLY';
      const { platformByTier, tenantByTier } = await this.loadPricingMaps(
        orgId,
        billingCycle,
        at
      );

      const grouped = new Map<string, ReturnType<typeof mapStation>[]>();
      for (const row of stations) {
        const bucket = grouped.get(row.stationSizeId) ?? [];
        bucket.push(mapStation(row));
        grouped.set(row.stationSizeId, bucket);
      }

      const billableByTier = await this.prisma.wifiStation.groupBy({
        by: ['stationSizeId'],
        where: { orgId, deletedAt: null, status: 'ACTIVE' },
        _count: { _all: true },
      });
      const billableCountByTier = new Map(
        billableByTier.map((row) => [row.stationSizeId, row._count._all])
      );

      let estimatedMonthlyTotal = 0;
      let hasEstimatedTotal = false;

      const groups = allTiers.map((tier) => {
        const tierBillableCount = billableCountByTier.get(tier.id) ?? 0;
        const tenantRate = resolveCurrentRate(tenantByTier.get(tier.id) ?? [], at);
        const platformRate = resolveCurrentRate(platformByTier.get(tier.id) ?? [], at);
        const effectiveRate = tenantRate ?? platformRate;
        const effectiveUnitPrice = decimalToString(effectiveRate?.unitPrice);
        const platformUnitPrice = decimalToString(platformRate?.unitPrice);
        const currency =
          effectiveRate?.currency ?? platformRate?.currency ?? license.currency ?? 'MMK';
        const subtotal = multiplyDecimal(effectiveUnitPrice, tierBillableCount);

        if (subtotal) {
          hasEstimatedTotal = true;
          estimatedMonthlyTotal += Number(subtotal);
        }

        return {
          stationSize: tier,
          sites: grouped.get(tier.id) ?? [],
          billableCount: tierBillableCount,
          displayedCount: (grouped.get(tier.id) ?? []).length,
          effectiveUnitPrice,
          platformUnitPrice,
          currency,
          hasOverride: Boolean(tenantRate),
          monthlySubtotal: subtotal,
        };
      });

      responseSuccess(res, {
        message: 'Success',
        data: {
          org: license.org,
          license: enrichLicense(license, billableCount),
          groups,
          allTiers,
        },
        meta: {
          totalBillable: billableCount,
          totalInactive: inactiveCount,
          stationLimit: license.stationLimit,
          remainingSlots: Math.max(0, license.stationLimit - billableCount),
          estimatedMonthlyTotal: hasEstimatedTotal ? estimatedMonthlyTotal.toFixed(2) : null,
          currency: license.currency ?? 'MMK',
          filteredCount: stations.length,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
      responseError(res, 405, {
        code: 'READ_ONLY',
        message: 'Licensed sites are managed from the WiFi sites module. This view is read-only.',
      });
    }),
  ];

  public remove = [
    asyncController(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
      responseError(res, 405, {
        code: 'READ_ONLY',
        message: 'Licensed sites cannot be removed from this screen.',
      });
    }),
  ];
}
