import { Prisma, type PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';
import { commissionForLine, type CommissionRuleRow } from './commission';
import { endOfUtcDay, startOfUtcDay, utcDayBucket } from './dates';

type BucketKey = string;

type SalesBucket = {
  orgId: string;
  date: Date;
  stationId: string | null;
  resellerId: string | null;
  planId: string;
  ordersCount: number;
  itemsCount: number;
  revenue: number;
  commission: number;
};

function bucketKey(
  orgId: string,
  stationId: string | null,
  resellerId: string | null,
  planId: string
): BucketKey {
  return [orgId, stationId ?? '', resellerId ?? '', planId].join('|');
}

async function loadRulesByOrg(prisma: PrismaClient, orgIds: string[]) {
  const rules = await prisma.commissionRule.findMany({
    where: { orgId: { in: orgIds }, deletedAt: null, isActive: true },
    select: {
      orgId: true,
      resellerId: true,
      planId: true,
      type: true,
      value: true,
      isActive: true,
    },
  });
  const map = new Map<string, CommissionRuleRow[]>();
  for (const row of rules) {
    const list = map.get(row.orgId) ?? [];
    list.push(row);
    map.set(row.orgId, list);
  }
  return map;
}

/**
 * Rebuilds `rpt_daily_sales_stat` for one UTC day from paid `wf_sale_order` rows.
 * Idempotent: deletes existing buckets for that day, then inserts fresh aggregates.
 */
export async function aggregateDailySalesForDate(
  prisma: PrismaClient,
  bucketDate: Date,
  orgIdFilter?: string
): Promise<number> {
  const dayStart = startOfUtcDay(bucketDate);
  const dayEnd = endOfUtcDay(bucketDate);
  const bucket = utcDayBucket(bucketDate);

  const orders = await prisma.saleOrder.findMany({
    where: {
      ...(orgIdFilter ? { orgId: orgIdFilter } : {}),
      status: 'PAID',
      soldAt: { gte: dayStart, lte: dayEnd },
    },
    select: {
      id: true,
      orgId: true,
      resellerId: true,
      stationId: true,
      items: {
        select: { planId: true, qty: true, lineTotal: true },
      },
    },
  });

  const orgIds = [...new Set(orders.map((o) => o.orgId))];
  const rulesByOrg = await loadRulesByOrg(prisma, orgIds);

  const buckets = new Map<BucketKey, SalesBucket>();
  const orderSeenPerBucket = new Map<BucketKey, Set<string>>();

  for (const order of orders) {
    const rules = rulesByOrg.get(order.orgId) ?? [];
    for (const item of order.items) {
      const key = bucketKey(order.orgId, order.stationId, order.resellerId, item.planId);
      const row =
        buckets.get(key) ??
        ({
          orgId: order.orgId,
          date: bucket,
          stationId: order.stationId,
          resellerId: order.resellerId,
          planId: item.planId,
          ordersCount: 0,
          itemsCount: 0,
          revenue: 0,
          commission: 0,
        } satisfies SalesBucket);

      const seen = orderSeenPerBucket.get(key) ?? new Set<string>();
      if (!seen.has(order.id)) {
        seen.add(order.id);
        orderSeenPerBucket.set(key, seen);
        row.ordersCount += 1;
      }

      row.itemsCount += item.qty;
      const lineRev = Number(item.lineTotal);
      row.revenue += lineRev;
      row.commission += commissionForLine(
        rules,
        order.resellerId,
        item.planId,
        item.lineTotal,
        item.qty
      );
      buckets.set(key, row);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.dailySalesStat.deleteMany({
      where: {
        ...(orgIdFilter ? { orgId: orgIdFilter } : {}),
        date: bucket,
      },
    });

    if (buckets.size === 0) return;

    await tx.dailySalesStat.createMany({
      data: [...buckets.values()].map((b) => ({
        orgId: b.orgId,
        date: b.date,
        stationId: b.stationId,
        resellerId: b.resellerId,
        planId: b.planId,
        ordersCount: b.ordersCount,
        itemsCount: b.itemsCount,
        revenue: new Prisma.Decimal(Math.round(b.revenue * 100) / 100),
        commission: new Prisma.Decimal(Math.round(b.commission * 100) / 100),
        netRevenue: new Prisma.Decimal(
          Math.round((b.revenue - b.commission) * 100) / 100
        ),
      })),
    });
  });

  logger.info(
    `[reporting] daily sales ${bucket.toISOString().slice(0, 10)}: ${buckets.size} buckets from ${orders.length} orders`
  );
  return buckets.size;
}
