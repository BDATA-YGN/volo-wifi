import { Prisma, type SaleStatus } from '@/generated/prisma/client';
import {
  adminRevocableStatuses,
  isRevokeWindowOpen,
  partnerRevocableStatuses,
} from './credential-permissions';
import { restoreVoucherBatchSlot } from './voucher-inventory';
import { endOpenRadiusSessionsForUser } from '@/features/shared/credentials/credential-sync.helpers';

function appendNote(existing: string | null | undefined, line: string): string {
  const base = existing?.trim();
  return base ? `${base}\n${line}` : line;
}

export type RevokeAccessTokenResult = {
  credentialId: string;
  orderId: string | null;
  orderStatus: SaleStatus | null;
  refundedAmount: number | null;
};

export type RevokeAccessTokenOptions = {
  elevated: boolean;
  enforceRevokeWindow: boolean;
  revokeWindowMinutes: number;
};

export async function revokeAccessToken(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string },
  options: RevokeAccessTokenOptions
): Promise<RevokeAccessTokenResult> {
  const { orgId, resellerId, credentialId } = params;
  const now = new Date();
  const revocable = options.elevated ? adminRevocableStatuses() : partnerRevocableStatuses();

  const existing = await tx.credential.findFirst({
    where: { id: credentialId, orgId, resellerId, deletedAt: null },
    select: { id: true, status: true, token: true, username: true, voucherBatchId: true, soldAt: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Access token not found.'), { status: 404, code: 'NOT_FOUND' });
  }

  if (!revocable.has(existing.status)) {
    throw Object.assign(
      new Error(`Tokens in status ${existing.status} cannot be revoked.`),
      { status: 409, code: 'CANNOT_REVOKE' }
    );
  }

  if (
    options.enforceRevokeWindow &&
    !isRevokeWindowOpen(existing.soldAt, options.revokeWindowMinutes, now)
  ) {
    throw Object.assign(
      new Error(
        `Revoke is only allowed within ${options.revokeWindowMinutes} minutes after sale.`
      ),
      { status: 403, code: 'REVOKE_WINDOW_EXPIRED' }
    );
  }

  await tx.credential.update({
    where: { id: existing.id },
    data: { status: 'REVOKED', revokedAt: now },
  });

  await endOpenRadiusSessionsForUser(tx, existing, 'Operator-Revoke');

  await restoreVoucherBatchSlot(tx, existing.voucherBatchId);

  const saleItem = await tx.saleItem.findFirst({
    where: { orgId, credentialId: existing.id },
    select: { id: true, orderId: true, lineTotal: true },
  });

  if (!saleItem) {
    return { credentialId: existing.id, orderId: null, orderStatus: null, refundedAmount: null };
  }

  const order = await tx.saleOrder.findFirst({
    where: { id: saleItem.orderId, orgId, status: 'PAID' },
    select: {
      id: true,
      status: true,
      subtotal: true,
      discount: true,
      total: true,
      note: true,
      items: {
        select: {
          id: true,
          lineTotal: true,
          credential: { select: { id: true, status: true } },
        },
      },
      payments: {
        select: { id: true, amount: true, note: true },
        orderBy: { paidAt: 'asc' },
        take: 1,
      },
    },
  });

  if (!order) {
    return {
      credentialId: existing.id,
      orderId: saleItem.orderId,
      orderStatus: null,
      refundedAmount: null,
    };
  }

  const tokenLabel = existing.token ?? existing.id;
  const refundNote = `Access token revoked (${tokenLabel}) at ${now.toISOString()}`;
  const payment = order.payments[0] ?? null;

  const activeItems = order.items.filter((item) => item.credential?.status !== 'REVOKED');
  const revokedLineTotal = saleItem.lineTotal;

  if (activeItems.length === 0) {
    await tx.saleOrder.update({
      where: { id: order.id },
      data: {
        status: 'REFUNDED',
        note: appendNote(order.note, refundNote),
      },
    });

    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          note: appendNote(payment.note, 'Sale refunded — linked access token revoked'),
        },
      });
    }

    return {
      credentialId: existing.id,
      orderId: order.id,
      orderStatus: 'REFUNDED',
      refundedAmount: Number(order.total),
    };
  }

  const newSubtotal = activeItems.reduce(
    (sum, item) => sum.add(item.lineTotal),
    new Prisma.Decimal(0)
  );
  const newTotal = Prisma.Decimal.max(new Prisma.Decimal(0), newSubtotal.sub(order.discount));

  await tx.saleOrder.update({
    where: { id: order.id },
    data: {
      subtotal: newSubtotal,
      total: newTotal,
      note: appendNote(order.note, refundNote),
    },
  });

  if (payment) {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        amount: newTotal,
        note: appendNote(
          payment.note,
          `Partial refund MMK ${Number(revokedLineTotal)} — token revoked (${tokenLabel})`
        ),
      },
    });
  }

  return {
    credentialId: existing.id,
    orderId: order.id,
    orderStatus: 'PAID',
    refundedAmount: Number(revokedLineTotal),
  };
}
