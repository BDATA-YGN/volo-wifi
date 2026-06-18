import { Prisma, type PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';
import { previousCalendarMonth, previousCalendarYear, startOfUtcDay } from './dates';

type DimKey = string;

function dimKey(
  stationId: string | null,
  resellerId: string | null,
  planId: string | null
): DimKey {
  return [stationId ?? '', resellerId ?? '', planId ?? ''].join('|');
}

/**
 * Rolls daily sales buckets into `rpt_monthly_sales_stat` for a calendar month.
 */
export async function rollupMonthlySales(
  prisma: PrismaClient,
  year: number,
  month: number,
  orgIdFilter?: string
): Promise<number> {
  const monthStart = startOfUtcDay(new Date(Date.UTC(year, month - 1, 1)));
  const monthEnd = startOfUtcDay(new Date(Date.UTC(year, month, 0)));
  monthEnd.setUTCHours(23, 59, 59, 999);

  const dailies = await prisma.dailySalesStat.findMany({
    where: {
      ...(orgIdFilter ? { orgId: orgIdFilter } : {}),
      deletedAt: null,
      date: { gte: monthStart, lte: monthEnd },
    },
    select: {
      orgId: true,
      stationId: true,
      resellerId: true,
      planId: true,
      ordersCount: true,
      itemsCount: true,
      revenue: true,
      commission: true,
      netRevenue: true,
    },
  });

  const buckets = new Map<
    string,
    {
      orgId: string;
      stationId: string | null;
      resellerId: string | null;
      planId: string | null;
      ordersCount: number;
      itemsCount: number;
      revenue: number;
      commission: number;
      netRevenue: number;
    }
  >();

  for (const row of dailies) {
    const key = `${row.orgId}|${dimKey(row.stationId, row.resellerId, row.planId)}`;
    const agg = buckets.get(key) ?? {
      orgId: row.orgId,
      stationId: row.stationId,
      resellerId: row.resellerId,
      planId: row.planId,
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    agg.ordersCount += row.ordersCount;
    agg.itemsCount += row.itemsCount;
    agg.revenue += Number(row.revenue);
    agg.commission += Number(row.commission);
    agg.netRevenue += Number(row.netRevenue);
    buckets.set(key, agg);
  }

  const orgIds = orgIdFilter
    ? [orgIdFilter]
    : [...new Set([...buckets.values()].map((b) => b.orgId))];

  await prisma.$transaction(async (tx) => {
    if (orgIds.length > 0) {
      await tx.monthlySalesStat.deleteMany({
        where: { orgId: { in: orgIds }, year, month },
      });
    }
    if (buckets.size === 0) return;
    await tx.monthlySalesStat.createMany({
      data: [...buckets.values()].map((b) => ({
        orgId: b.orgId,
        year,
        month,
        stationId: b.stationId,
        resellerId: b.resellerId,
        planId: b.planId,
        ordersCount: b.ordersCount,
        itemsCount: b.itemsCount,
        revenue: new Prisma.Decimal(Math.round(b.revenue * 100) / 100),
        commission: new Prisma.Decimal(Math.round(b.commission * 100) / 100),
        netRevenue: new Prisma.Decimal(Math.round(b.netRevenue * 100) / 100),
      })),
    });
  });

  logger.info(`[reporting] monthly sales rollup ${year}-${String(month).padStart(2, '0')}: ${buckets.size} buckets`);
  return buckets.size;
}

/**
 * Rolls monthly sales into `rpt_yearly_sales_stat` for a calendar year.
 */
export async function rollupYearlySales(
  prisma: PrismaClient,
  year: number,
  orgIdFilter?: string
): Promise<number> {
  const monthlies = await prisma.monthlySalesStat.findMany({
    where: {
      ...(orgIdFilter ? { orgId: orgIdFilter } : {}),
      deletedAt: null,
      year,
    },
    select: {
      orgId: true,
      stationId: true,
      resellerId: true,
      planId: true,
      ordersCount: true,
      itemsCount: true,
      revenue: true,
      commission: true,
      netRevenue: true,
    },
  });

  const buckets = new Map<
    string,
    {
      orgId: string;
      stationId: string | null;
      resellerId: string | null;
      planId: string | null;
      ordersCount: number;
      itemsCount: number;
      revenue: number;
      commission: number;
      netRevenue: number;
    }
  >();

  for (const row of monthlies) {
    const key = `${row.orgId}|${dimKey(row.stationId, row.resellerId, row.planId)}`;
    const agg = buckets.get(key) ?? {
      orgId: row.orgId,
      stationId: row.stationId,
      resellerId: row.resellerId,
      planId: row.planId,
      ordersCount: 0,
      itemsCount: 0,
      revenue: 0,
      commission: 0,
      netRevenue: 0,
    };
    agg.ordersCount += row.ordersCount;
    agg.itemsCount += row.itemsCount;
    agg.revenue += Number(row.revenue);
    agg.commission += Number(row.commission);
    agg.netRevenue += Number(row.netRevenue);
    buckets.set(key, agg);
  }

  const orgIds = orgIdFilter
    ? [orgIdFilter]
    : [...new Set([...buckets.values()].map((b) => b.orgId))];

  await prisma.$transaction(async (tx) => {
    if (orgIds.length > 0) {
      await tx.yearlySalesStat.deleteMany({
        where: { orgId: { in: orgIds }, year },
      });
    }
    if (buckets.size === 0) return;
    await tx.yearlySalesStat.createMany({
      data: [...buckets.values()].map((b) => ({
        orgId: b.orgId,
        year,
        stationId: b.stationId,
        resellerId: b.resellerId,
        planId: b.planId,
        ordersCount: b.ordersCount,
        itemsCount: b.itemsCount,
        revenue: new Prisma.Decimal(Math.round(b.revenue * 100) / 100),
        commission: new Prisma.Decimal(Math.round(b.commission * 100) / 100),
        netRevenue: new Prisma.Decimal(Math.round(b.netRevenue * 100) / 100),
      })),
    });
  });

  logger.info(`[reporting] yearly sales rollup ${year}: ${buckets.size} buckets`);
  return buckets.size;
}

export async function rollupPreviousClosedPeriods(prisma: PrismaClient): Promise<void> {
  const { year, month } = previousCalendarMonth();
  await rollupMonthlySales(prisma, year, month);

  const now = new Date();
  if (now.getUTCMonth() === 0) {
    const prevYear = previousCalendarYear(now);
    await rollupYearlySales(prisma, prevYear);
  }
}
