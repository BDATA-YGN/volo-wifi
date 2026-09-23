import type { PrismaClient } from '@/generated/prisma/client';
import { logger } from '@/logging/logger';

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
    const deleted = await prisma.$executeRaw`
      WITH picked AS (
        SELECT o.id
        FROM wf_sale_order o
        WHERE o.status IN ('PAID', 'VOID', 'REFUNDED')
          AND COALESCE(o.sold_at, o.created_at) < ${cutoff}
        ORDER BY COALESCE(o.sold_at, o.created_at)
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      ),
      inserted AS (
        INSERT INTO wf_sale_order_archive (
          id, source_id, org_id, order_no, status, reseller_id, station_id,
          total, currency, sold_at, source_created_at, payload
        )
        SELECT
          gen_random_uuid(),
          o.id,
          o.org_id,
          o.order_no,
          o.status,
          o.reseller_id,
          o.station_id,
          o.total,
          o.currency,
          o.sold_at,
          o.created_at,
          jsonb_build_object(
            'subtotal', o.subtotal,
            'discount', o.discount,
            'note', o.note,
            'items', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'id', i.id,
                'planId', i.plan_id,
                'credentialId', i.credential_id,
                'qty', i.qty,
                'unitPrice', i.unit_price,
                'lineTotal', i.line_total,
                'createdAt', i.created_at
              ) ORDER BY i.created_at)
              FROM wf_sale_item i
              WHERE i.order_id = o.id AND i.org_id = o.org_id
            ), '[]'::jsonb),
            'payments', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'id', p.id,
                'method', p.method,
                'amount', p.amount,
                'refNo', p.ref_no,
                'paidAt', p.paid_at,
                'note', p.note,
                'createdAt', p.created_at
              ) ORDER BY p.paid_at)
              FROM wf_payment p
              WHERE p.order_id = o.id AND p.org_id = o.org_id
            ), '[]'::jsonb)
          )
        FROM wf_sale_order o
        JOIN picked ON picked.id = o.id
        ON CONFLICT (source_id) DO NOTHING
        RETURNING source_id
      ),
      del_pay AS (
        DELETE FROM wf_payment p
        USING picked
        WHERE p.order_id = picked.id
        RETURNING p.id
      ),
      del_item AS (
        DELETE FROM wf_sale_item i
        USING picked
        WHERE i.order_id = picked.id
        RETURNING i.id
      )
      DELETE FROM wf_sale_order o
      USING picked
      WHERE o.id = picked.id
    `;
    archived += deleted;
    if (deleted === 0) break;
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
    const deleted = await prisma.$executeRaw`
      WITH picked AS (
        SELECT o.id
        FROM wf_sale_order o
        WHERE o.status = 'DRAFT'
          AND o.created_at < ${cutoff}
        ORDER BY o.created_at
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      ),
      del_pay AS (
        DELETE FROM wf_payment p
        USING picked
        WHERE p.order_id = picked.id
        RETURNING p.id
      ),
      del_item AS (
        DELETE FROM wf_sale_item i
        USING picked
        WHERE i.order_id = picked.id
        RETURNING i.id
      )
      DELETE FROM wf_sale_order o
      USING picked
      WHERE o.id = picked.id
    `;
    removed += deleted;
    if (deleted === 0) break;
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
