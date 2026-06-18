import type { PrismaClient } from '@/generated/prisma/client';
import { stationLicensePricesData, stationSizesData } from './stationCapacityTiers';

export async function seedStationCapacityTiers(prisma: PrismaClient): Promise<{
  tiers: number;
  prices: number;
}> {
  const effectiveFrom = new Date('2026-01-01T00:00:00.000Z');
  let prices = 0;

  for (const tier of stationSizesData) {
    const stationSize = await prisma.stationSize.upsert({
      where: { code: tier.code },
      create: {
        code: tier.code,
        name: tier.name,
        description: tier.description,
        sortOrder: tier.sortOrder,
        isActive: true,
      },
      update: {
        name: tier.name,
        description: tier.description,
        sortOrder: tier.sortOrder,
        isActive: true,
      },
    });

    const rate = stationLicensePricesData[tier.code];
    const existingPrice = await prisma.stationLicensePrice.findFirst({
      where: {
        stationSizeId: stationSize.id,
        billingCycle: 'MONTHLY',
        isActive: true,
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!existingPrice) {
      await prisma.stationLicensePrice.create({
        data: {
          stationSizeId: stationSize.id,
          billingCycle: 'MONTHLY',
          unitPrice: rate.unitPrice,
          currency: rate.currency,
          effectiveFrom,
          isActive: true,
        },
      });
      prices += 1;
    }
  }

  return { tiers: stationSizesData.length, prices };
}
