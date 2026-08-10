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
  tx: InventoryClient,
  orgId: string,
  planId: string,
  stationId: string,
  quantity: number
): Promise<string[]> {
  const available = await countAvailableVoucherSlots(tx, orgId, planId, stationId);
  if (available < quantity) {
    throw new InsufficientVoucherInventoryError(available, quantity);
  }

  const batchIds: string[] = [];
  for (let i = 0; i < quantity; i += 1) {
    batchIds.push(await reserveVoucherBatchSlot(tx, orgId, planId, stationId));
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
