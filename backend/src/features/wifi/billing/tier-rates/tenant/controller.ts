import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import { tenantTierRateOverrideTakenMessage } from '@/features/wifi/shared/conflict-messages';
import {
  BillingTierRatesTenantCreateSchema,
  BillingTierRatesTenantUpdateSchema,
} from './schema';

const orgSummarySelect = {
  id: true,
  code: true,
  name: true,
  currency: true,
  isActive: true,
  orgLicense: {
    select: {
      id: true,
      status: true,
      billingCycle: true,
      stationLimit: true,
      effectiveFrom: true,
    },
  },
} satisfies Prisma.OrgSelect;

const tenantPriceSelect = {
  id: true,
  orgId: true,
  stationSizeId: true,
  billingCycle: true,
  unitPrice: true,
  currency: true,
  pricingSource: true,
  effectiveFrom: true,
  effectiveTo: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  stationSize: {
    select: { id: true, code: true, name: true, sortOrder: true, isActive: true },
  },
  org: {
    select: { id: true, code: true, name: true, currency: true },
  },
} satisfies Prisma.OrgLicenseStationSizePriceSelect;

const platformPriceSelect = {
  id: true,
  stationSizeId: true,
  billingCycle: true,
  unitPrice: true,
  currency: true,
  effectiveFrom: true,
  effectiveTo: true,
  isActive: true,
} satisfies Prisma.StationLicensePriceSelect;

type TenantPriceRow = Prisma.OrgLicenseStationSizePriceGetPayload<{
  select: typeof tenantPriceSelect;
}>;
type PlatformPriceRow = Prisma.StationLicensePriceGetPayload<{
  select: typeof platformPriceSelect;
}>;

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

function resolveScheduledRate<T extends { effectiveFrom: Date; isActive: boolean }>(
  prices: T[],
  at: Date
): T | null {
  return (
    prices
      .filter((p) => p.isActive && p.effectiveFrom > at)
      .sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime())[0] ?? null
  );
}

/** menus.wifi.billing.tier-rates.tenant @route /wifi/billing/tier-rates/tenant */
export class BillingTierRatesTenantController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  private async loadPlatformRatesByTier(
    billingCycle: 'MONTHLY',
    at: Date
  ): Promise<Map<string, PlatformPriceRow>> {
    const platformPrices = await this.prisma.stationLicensePrice.findMany({
      where: { billingCycle, isActive: true },
      select: platformPriceSelect,
      orderBy: { effectiveFrom: 'desc' },
    });

    const byTier = new Map<string, PlatformPriceRow[]>();
    for (const row of platformPrices) {
      const bucket = byTier.get(row.stationSizeId) ?? [];
      bucket.push(row);
      byTier.set(row.stationSizeId, bucket);
    }

    const resolved = new Map<string, PlatformPriceRow>();
    for (const [tierId, rows] of byTier) {
      const current = resolveCurrentRate(rows, at);
      if (current) resolved.set(tierId, current);
    }
    return resolved;
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const row = await this.prisma.orgLicenseStationSizePrice.findUnique({
          where: { id: req.params.id },
          select: tenantPriceSelect,
        });
        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Tenant tier rate override not found.',
          });
        }
        return responseSuccess(res, { message: 'Success', data: row });
      }

      const orgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';
      const billingCycle = 'MONTHLY';
      const now = new Date();

      if (!orgId) {
        const [orgs, overrideGroups] = await Promise.all([
          this.prisma.org.findMany({
            where: { deletedAt: null, isActive: true },
            select: orgSummarySelect,
            orderBy: [{ name: 'asc' }],
          }),
          this.prisma.orgLicenseStationSizePrice.groupBy({
            by: ['orgId'],
            where: { isActive: true, billingCycle },
            _count: { _all: true },
          }),
        ]);

        const overrideCountByOrg = new Map(
          overrideGroups.map((g) => [g.orgId, g._count._all])
        );

        return responseSuccess(res, {
          message: 'Success',
          data: {
            orgs: orgs.map((org) => ({
              ...org,
              overrideCount: overrideCountByOrg.get(org.id) ?? 0,
            })),
          },
          meta: { orgCount: orgs.length },
        });
      }

      const org = await this.prisma.org.findFirst({
        where: { id: orgId, deletedAt: null },
        select: orgSummarySelect,
      });
      if (!org) {
        return responseError(res, 404, {
          code: 'ORG_NOT_FOUND',
          message: 'Tenant organization not found.',
        });
      }

      const [tiers, tenantPrices, platformByTier] = await Promise.all([
        this.prisma.stationSize.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            sortOrder: true,
            isActive: true,
          },
        }),
        this.prisma.orgLicenseStationSizePrice.findMany({
          where: { orgId, billingCycle },
          select: tenantPriceSelect,
          orderBy: { effectiveFrom: 'desc' },
        }),
        this.loadPlatformRatesByTier(billingCycle, now),
      ]);

      const tenantByTier = new Map<string, TenantPriceRow[]>();
      for (const price of tenantPrices) {
        const bucket = tenantByTier.get(price.stationSizeId) ?? [];
        bucket.push(price);
        tenantByTier.set(price.stationSizeId, bucket);
      }

      let overrideCount = 0;
      let platformDefaultCount = 0;

      const matrix = tiers.map((tier) => {
        const tierTenantPrices = tenantByTier.get(tier.id) ?? [];
        const tenantOverride = resolveCurrentRate(tierTenantPrices, now);
        const scheduledOverride = resolveScheduledRate(tierTenantPrices, now);
        const platformRate = platformByTier.get(tier.id) ?? null;

        if (tenantOverride) overrideCount += 1;
        else platformDefaultCount += 1;

        const effectiveRate = tenantOverride ?? platformRate;

        return {
          stationSize: tier,
          platformRate,
          tenantOverride,
          scheduledOverride,
          effectiveRate,
          usesPlatformDefault: tenantOverride === null,
        };
      });

      responseSuccess(res, {
        message: 'Success',
        data: {
          org,
          matrix,
          history: tenantPrices,
        },
        meta: {
          orgId,
          billingCycle,
          tierCount: tiers.length,
          overrideCount,
          platformDefaultCount,
          scheduledCount: matrix.filter((r) => r.scheduledOverride !== null).length,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');

      const { error, value } = (isUpdate
        ? BillingTierRatesTenantUpdateSchema
        : BillingTierRatesTenantCreateSchema
      ).validate(req.body, { abortEarly: false, allowUnknown: false });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (isUpdate) {
        const existing = await this.prisma.orgLicenseStationSizePrice.findUnique({
          where: { id: recordId! },
          select: { id: true },
        });
        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Tenant tier rate override not found.',
          });
        }

        const updated = await this.prisma.orgLicenseStationSizePrice.update({
          where: { id: recordId! },
          data: {
            ...(value.unitPrice !== undefined ? { unitPrice: value.unitPrice } : {}),
            ...(value.currency !== undefined ? { currency: value.currency } : {}),
            ...(value.effectiveFrom !== undefined
              ? { effectiveFrom: new Date(value.effectiveFrom) }
              : {}),
            ...(value.effectiveTo !== undefined
              ? { effectiveTo: value.effectiveTo ? new Date(value.effectiveTo) : null }
              : {}),
            ...(value.isActive !== undefined ? { isActive: value.isActive } : {}),
          },
          select: tenantPriceSelect,
        });

        return responseSuccess(res, { message: 'Tenant tier rate updated', data: updated });
      }

      const [org, tier] = await Promise.all([
        this.prisma.org.findFirst({
          where: { id: value.orgId, deletedAt: null, isActive: true },
          select: { id: true, code: true, currency: true },
        }),
        this.prisma.stationSize.findUnique({
          where: { id: value.stationSizeId },
          select: { id: true, isActive: true },
        }),
      ]);

      if (!org) {
        return responseError(res, 404, {
          code: 'ORG_NOT_FOUND',
          message: 'Tenant organization not found or inactive.',
        });
      }
      if (!tier?.isActive) {
        return responseError(res, 409, {
          code: 'TIER_INACTIVE',
          message: 'Cannot assign an override to an inactive capacity tier.',
        });
      }

      const effectiveFrom = new Date(value.effectiveFrom);
      const billingCycle = value.billingCycle ?? 'MONTHLY';
      const currency = value.currency ?? org.currency ?? 'MMK';

      try {
        const created = await this.prisma.$transaction(async (tx) => {
          await tx.orgLicenseStationSizePrice.updateMany({
            where: {
              orgId: value.orgId,
              stationSizeId: value.stationSizeId,
              billingCycle,
              isActive: true,
              effectiveFrom: { lt: effectiveFrom },
              OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
            },
            data: {
              isActive: false,
              effectiveTo: effectiveFrom,
            },
          });

          return tx.orgLicenseStationSizePrice.create({
            data: {
              orgId: value.orgId,
              stationSizeId: value.stationSizeId,
              billingCycle,
              unitPrice: value.unitPrice,
              currency,
              pricingSource: 'ORG_CUSTOM',
              effectiveFrom,
              effectiveTo: value.effectiveTo ? new Date(value.effectiveTo) : null,
              isActive: value.isActive ?? true,
            },
            select: tenantPriceSelect,
          });
        });

        responseSuccess(res, { message: 'Tenant tier rate override created', data: created });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === 'P2002'
        ) {
          return responseError(res, 409, {
            code: 'DUPLICATE_EFFECTIVE_DATE',
            message: tenantTierRateOverrideTakenMessage(),
          });
        }
        throw err;
      }
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const id = req.params.id;
      const existing = await this.prisma.orgLicenseStationSizePrice.findUnique({
        where: { id },
        select: { id: true, effectiveFrom: true, isActive: true },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Tenant tier rate override not found.',
        });
      }

      const now = new Date();
      if (existing.isActive && existing.effectiveFrom <= now) {
        return responseError(res, 409, {
          code: 'RATE_IN_EFFECT',
          message:
            'Cannot delete an override that is currently in effect. Deactivate it to fall back to platform rates.',
        });
      }

      await this.prisma.orgLicenseStationSizePrice.delete({ where: { id } });
      responseSuccess(res, { message: 'Tenant tier rate override deleted', data: { id } });
    }),
  ];
}
