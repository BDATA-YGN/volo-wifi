import type { PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';

const CLOSED_STATUSES = ['PAID', 'VOID', 'REFUNDED'] as const;

/**
 * Archives closed sale orders (snapshot includes items + payments), then removes hot rows.
 */
export async function archiveSaleOrders(
  prisma: PrismaClient,
  hotRetentionDays: number,
  batchSize: number
): Promise<number> {
  const cutoff = new Date(Date.now() - hotRetentionDays * 86_400_000);
  let archived = 0;

  while (true) {
    const orders = await prisma.saleOrder.findMany({
      where: {
        status: { in: [...CLOSED_STATUSES] },
        OR: [{ soldAt: { lt: cutoff } }, { soldAt: null, createdAt: { lt: cutoff } }],
      },
      include: {
        items: {
          select: {
            id: true,
            planId: true,
            credentialId: true,
            qty: true,
            unitPrice: true,
            lineTotal: true,
            createdAt: true,
          },
        },
        payments: {
          select: {
            id: true,
            method: true,
            amount: true,
            refNo: true,
            paidAt: true,
            note: true,
            createdAt: true,
          },
        },
      },
      take: batchSize,
      orderBy: { soldAt: 'asc' },
    });

    if (orders.length === 0) break;

    for (const order of orders) {
      const exists = await prisma.saleOrderArchive.findUnique({
        where: { sourceId: order.id },
        select: { id: true },
      });
      if (exists) {
        await prisma.$transaction([
          prisma.payment.deleteMany({ where: { orderId: order.id } }),
          prisma.saleItem.deleteMany({ where: { orderId: order.id } }),
          prisma.saleOrder.delete({ where: { id: order.id } }),
        ]);
        archived += 1;
        continue;
      }

      await prisma.$transaction([
        prisma.saleOrderArchive.create({
          data: {
            sourceId: order.id,
            orgId: order.orgId,
            orderNo: order.orderNo,
            status: order.status,
            resellerId: order.resellerId,
            stationId: order.stationId,
            total: order.total,
            currency: order.currency,
            soldAt: order.soldAt,
            sourceCreatedAt: order.createdAt,
            payload: {
              subtotal: order.subtotal,
              discount: order.discount,
              note: order.note,
              items: order.items,
              payments: order.payments,
            },
          },
        }),
        prisma.payment.deleteMany({ where: { orderId: order.id } }),
        prisma.saleItem.deleteMany({ where: { orderId: order.id } }),
        prisma.saleOrder.delete({ where: { id: order.id } }),
      ]);
      archived += 1;
    }

    if (orders.length < batchSize) break;
  }

  logger.info(`[ops-archive] sale orders archived: ${archived}`);
  return archived;
}

/** Deletes abandoned DRAFT orders past retention (no archive). */
export async function purgeDraftSaleOrders(
  prisma: PrismaClient,
  draftRetentionDays: number,
  batchSize: number
): Promise<number> {
  const cutoff = new Date(Date.now() - draftRetentionDays * 86_400_000);
  let removed = 0;

  while (true) {
    const drafts = await prisma.saleOrder.findMany({
      where: { status: 'DRAFT', createdAt: { lt: cutoff } },
      select: { id: true },
      take: batchSize,
    });
    if (drafts.length === 0) break;

    for (const row of drafts) {
      await prisma.$transaction([
        prisma.payment.deleteMany({ where: { orderId: row.id } }),
        prisma.saleItem.deleteMany({ where: { orderId: row.id } }),
        prisma.saleOrder.delete({ where: { id: row.id } }),
      ]);
      removed += 1;
    }

    if (drafts.length < batchSize) break;
  }

  logger.info(`[ops-archive] draft sale orders purged: ${removed}`);
  return removed;
}

export async function purgeExpiredSaleOrderArchives(
  prisma: PrismaClient,
  retentionDays: number,
  batchSize: number
): Promise<number> {
  if (retentionDays <= 0) return 0;
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  let removed = 0;

  while (true) {
    const rows = await prisma.saleOrderArchive.findMany({
      where: { archivedAt: { lt: cutoff } },
      select: { id: true },
      take: batchSize,
    });
    if (rows.length === 0) break;
    const result = await prisma.saleOrderArchive.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    removed += result.count;
    if (rows.length < batchSize) break;
  }

  logger.info(`[ops-archive] sale order archives purged: ${removed}`);
  return removed;
}
