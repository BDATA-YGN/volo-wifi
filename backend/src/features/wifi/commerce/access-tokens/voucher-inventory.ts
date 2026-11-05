import { Prisma } from '@/generated/prisma/client';

export class InsufficientVoucherInventoryError extends Error {
  readonly status = 409;
  readonly code = 'INSUFFICIENT_VOUCHER_INVENTORY';

  constructor(available: number, requested: number) {
    super(formatInsufficientVoucherInventoryMessage(available, requested));
    this.name = 'InsufficientVoucherInventoryError';
  }
}

/** End-user copy when voucher-run token allowance is exhausted or too low. */
export function formatInsufficientVoucherInventoryMessage(
  available: number,
  requested: number,
): string {
  if (available <= 0) {
    return (
      'Token allowance for this plan and site is used up. ' +
      'Create a new voucher run (Access → Voucher Runs) to add more tokens before issuing.'
    );
  }
  const left = available === 1 ? '1 token left' : `${available} tokens left`;
  return (
    `Not enough tokens left to issue. ${left} for this plan and site, ` +
    `but you requested ${requested}. Lower the quantity or create a new voucher run.`
  );
}

type InventoryClient = Pick<Prisma.TransactionClient, 'voucherBatch'>;
type InventoryLockClient = InventoryClient & Pick<Prisma.TransactionClient, '$queryRaw'>;

/** Batches that can supply vouchers for a partner sale (HQ runs only). */
export function voucherBatchAvailabilityWhere(
  orgId: string,
  planId: string,
  stationId: string
): Prisma.VoucherBatchWhereInput {
  return {
    orgId,
    planId,
    deletedAt: null,
    resellerId: null,
    remainingQuantity: { gt: 0 },
    OR: [{ stationId: null }, { stationId }],
  };
}

export async function countAvailableVoucherSlots(
  prisma: InventoryClient,
  orgId: string,
  planId: string,
  stationId: string
): Promise<number> {
  const result = await prisma.voucherBatch.aggregate({
    where: voucherBatchAvailabilityWhere(orgId, planId, stationId),
    _sum: { remainingQuantity: true },
  });
  return result._sum.remainingQuantity ?? 0;
}

/**
 * Reserve one slot from the oldest batch with remaining capacity (FIFO).
 * Must run inside a transaction — decrements `remainingQuantity` atomically.
 */
export async function reserveVoucherBatchSlot(
  tx: InventoryClient,
  orgId: string,
  planId: string,
  stationId: string
): Promise<string> {
  const batches = await tx.voucherBatch.findMany({
    where: voucherBatchAvailabilityWhere(orgId, planId, stationId),
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  for (const batch of batches) {
    const updated = await tx.voucherBatch.updateMany({
      where: { id: batch.id, remainingQuantity: { gt: 0 } },
      data: { remainingQuantity: { decrement: 1 } },
    });
    if (updated.count === 1) {
      return batch.id;
    }
  }

  throw new InsufficientVoucherInventoryError(0, 1);
}

export async function reserveVoucherBatchSlots(
  tx: InventoryLockClient,
  orgId: string,
  planId: string,
  stationId: string,
  quantity: number
): Promise<string[]> {
  if (quantity <= 0) return [];

  // Lock the open runs in FIFO order so two sales cannot read the same
  // remaining quantity and both succeed. Ids are text, not uuid.
  const locked = await tx.$queryRaw<Array<{ id: string; remainingQuantity: number }>>`
    SELECT id, remaining_quantity AS "remainingQuantity"
    FROM wf_voucher_batch
    WHERE org_id = ${orgId}
      AND plan_id = ${planId}
      AND deleted_at IS NULL
      AND reseller_id IS NULL
      AND remaining_quantity > 0
      AND (station_id IS NULL OR station_id = ${stationId})
    ORDER BY created_at ASC
    FOR UPDATE
  `;
  const batches = locked.map((row) => ({
    id: row.id,
    remainingQuantity: Number(row.remainingQuantity),
  }));

  const plan: { id: string; take: number }[] = [];
  let need = quantity;
  let available = 0;
  for (const batch of batches) {
    available += batch.remainingQuantity;
    if (need <= 0) continue;
    const take = Math.min(batch.remainingQuantity, need);
    if (take > 0) {
      plan.push({ id: batch.id, take });
      need -= take;
    }
  }
  if (need > 0) {
    throw new InsufficientVoucherInventoryError(available, quantity);
  }

  const batchIds: string[] = [];
  for (const slot of plan) {
    const updated = await tx.voucherBatch.updateMany({
      where: { id: slot.id, remainingQuantity: { gte: slot.take } },
      data: { remainingQuantity: { decrement: slot.take } },
    });
    if (updated.count !== 1) {
      // Another sale took this batch between the read and the decrement.
      // Keep slots already reserved and fill the rest one by one, still FIFO.
      const rest = quantity - batchIds.length;
      for (let i = 0; i < rest; i += 1) {
        batchIds.push(await reserveVoucherBatchSlot(tx, orgId, planId, stationId));
      }
      return batchIds;
    }
    for (let i = 0; i < slot.take; i += 1) {
      batchIds.push(slot.id);
    }
  }
  return batchIds;
}

/** Return a sold slot to its voucher run when a partner revokes a token. */
export async function restoreVoucherBatchSlot(
  tx: InventoryClient,
  voucherBatchId: string | null | undefined
): Promise<void> {
  if (!voucherBatchId) return;

  const batch = await tx.voucherBatch.findFirst({
    where: { id: voucherBatchId, deletedAt: null },
    select: { id: true, quantity: true, remainingQuantity: true },
  });
  if (!batch) return;

  if (batch.remainingQuantity >= batch.quantity) {
    return;
  }

  await tx.voucherBatch.update({
    where: { id: batch.id },
    data: { remainingQuantity: { increment: 1 } },
  });
}
