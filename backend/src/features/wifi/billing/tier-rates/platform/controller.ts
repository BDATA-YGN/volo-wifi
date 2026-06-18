import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import {
  BillingTierRatesPlatformCreateSchema,
  BillingTierRatesPlatformUpdateSchema,
} from './schema';

const priceSelect = {
  id: true,
  stationSizeId: true,
  billingCycle: true,
  unitPrice: true,
  currency: true,
  effectiveFrom: true,
  effectiveTo: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  stationSize: {
    select: {
      id: true,
      code: true,
      name: true,
      sortOrder: true,
      isActive: true,
    },
  },
} satisfies Prisma.StationLicensePriceSelect;

type PriceRow = Prisma.StationLicensePriceGetPayload<{ select: typeof priceSelect }>;

function isRateEffective(price: PriceRow, at: Date): boolean {
  if (!price.isActive) return false;
  if (price.effectiveFrom > at) return false;
  if (price.effectiveTo && price.effectiveTo <= at) return false;
  return true;
}

function resolveTierRates(prices: PriceRow[], at: Date) {
  const current =
    prices
      .filter((p) => isRateEffective(p, at))
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0] ?? null;

  const scheduled =
    prices
      .filter((p) => p.isActive && p.effectiveFrom > at)
      .sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime())[0] ?? null;

  return { current, scheduled };
}

/** menus.wifi.billing.tier-rates.platform @route /wifi/billing/tier-rates/platform */
export class BillingTierRatesPlatformController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      if (!isUndefinedOrUndefinedString(req.params?.id)) {
        const row = await this.prisma.stationLicensePrice.findUnique({
          where: { id: req.params.id },
          select: priceSelect,
        });
        if (!row) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Platform tier rate not found.',
          });
        }
        return responseSuccess(res, { message: 'Success', data: row });
      }

      const now = new Date();
      const billingCycle =
        typeof req.query.billingCycle === 'string' ? req.query.billingCycle : 'MONTHLY';

      const [tiers, prices] = await Promise.all([
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
        this.prisma.stationLicensePrice.findMany({
          where: { billingCycle: billingCycle as 'MONTHLY' },
          select: priceSelect,
          orderBy: [{ effectiveFrom: 'desc' }],
        }),
      ]);

      const pricesByTier = new Map<string, PriceRow[]>();
      for (const price of prices) {
        const bucket = pricesByTier.get(price.stationSizeId) ?? [];
        bucket.push(price);
        pricesByTier.set(price.stationSizeId, bucket);
      }

      const matrix = tiers.map((tier) => {
        const tierPrices = pricesByTier.get(tier.id) ?? [];
        const { current, scheduled } = resolveTierRates(tierPrices, now);
        return {
          stationSize: tier,
          currentRate: current,
          scheduledRate: scheduled,
        };
      });

      const coveredCount = matrix.filter((row) => row.currentRate !== null).length;
      const missingTiers = matrix.filter((row) => row.currentRate === null).map((r) => r.stationSize);

      responseSuccess(res, {
        message: 'Success',
        data: {
          matrix,
          history: prices,
        },
        meta: {
          billingCycle,
          tierCount: tiers.length,
          coveredCount,
          missingCount: missingTiers.length,
          missingTiers,
          scheduledCount: matrix.filter((row) => row.scheduledRate !== null).length,
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const recordId = (req.params?.id as string) ?? null;
      const isUpdate = Boolean(recordId && recordId !== 'all');

      const { error, value } = (isUpdate
        ? BillingTierRatesPlatformUpdateSchema
        : BillingTierRatesPlatformCreateSchema
      ).validate(req.body, { abortEarly: false, allowUnknown: false });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      if (isUpdate) {
        const existing = await this.prisma.stationLicensePrice.findUnique({
          where: { id: recordId! },
          select: { id: true },
        });
        if (!existing) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Platform tier rate not found.',
          });
        }

        const updated = await this.prisma.stationLicensePrice.update({
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
          select: priceSelect,
        });

        return responseSuccess(res, { message: 'Platform tier rate updated', data: updated });
      }

      const tier = await this.prisma.stationSize.findUnique({
        where: { id: value.stationSizeId },
        select: { id: true, code: true, isActive: true },
      });
      if (!tier) {
        return responseError(res, 404, {
          code: 'TIER_NOT_FOUND',
          message: 'Capacity tier not found.',
        });
      }
      if (!tier.isActive) {
        return responseError(res, 409, {
          code: 'TIER_INACTIVE',
          message: 'Cannot assign a rate to an inactive capacity tier.',
        });
      }

      const effectiveFrom = new Date(value.effectiveFrom);
      const billingCycle = value.billingCycle ?? 'MONTHLY';

      const created = await this.prisma.$transaction(async (tx) => {
        await tx.stationLicensePrice.updateMany({
          where: {
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

        return tx.stationLicensePrice.create({
          data: {
            stationSizeId: value.stationSizeId,
            billingCycle,
            unitPrice: value.unitPrice,
            currency: value.currency ?? 'MMK',
            effectiveFrom,
            effectiveTo: value.effectiveTo ? new Date(value.effectiveTo) : null,
            isActive: value.isActive ?? true,
          },
          select: priceSelect,
        });
      });

      responseSuccess(res, { message: 'Platform tier rate created', data: created });
    }),
  ];

  public remove = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const id = req.params.id;
      const existing = await this.prisma.stationLicensePrice.findUnique({
        where: { id },
        select: { id: true, effectiveFrom: true, isActive: true },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Platform tier rate not found.',
        });
      }

      const now = new Date();
      if (existing.isActive && existing.effectiveFrom <= now) {
        return responseError(res, 409, {
          code: 'RATE_IN_EFFECT',
          message:
            'Cannot delete a rate that is currently in effect. Deactivate it or schedule a replacement instead.',
        });
      }

      await this.prisma.stationLicensePrice.delete({ where: { id } });
      responseSuccess(res, { message: 'Platform tier rate deleted', data: { id } });
    }),
  ];
}
