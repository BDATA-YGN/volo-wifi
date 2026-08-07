import type { Prisma } from '@/generated/prisma/client';

const PAUSABLE = new Set(['ACTIVATED']);

export async function pauseAccessToken(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string }
): Promise<void> {
  const existing = await tx.credential.findFirst({
    where: { id: params.credentialId, orgId: params.orgId, resellerId: params.resellerId, deletedAt: null },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Access token not found.'), { status: 404, code: 'NOT_FOUND' });
  }

  if (!PAUSABLE.has(existing.status)) {
    throw Object.assign(new Error(`Tokens in status ${existing.status} cannot be paused.`), {
      status: 409,
      code: 'CANNOT_PAUSE',
    });
  }

  await tx.credential.update({
    where: { id: existing.id },
    data: { status: 'PAUSED' },
  });
}

export async function unlockAccessToken(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string }
): Promise<void> {
  const existing = await tx.credential.findFirst({
    where: { id: params.credentialId, orgId: params.orgId, resellerId: params.resellerId, deletedAt: null },
    select: { id: true, status: true, activatedAt: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Access token not found.'), { status: 404, code: 'NOT_FOUND' });
  }

  if (existing.status !== 'PAUSED') {
    throw Object.assign(new Error(`Tokens in status ${existing.status} cannot be unlocked.`), {
      status: 409,
      code: 'CANNOT_UNLOCK',
    });
  }

  const now = new Date();
  await tx.credential.update({
    where: { id: existing.id },
    data: {
      status: 'ACTIVATED',
      activatedAt: existing.activatedAt ?? now,
      singleSessionResellerUnlockAt: now,
    },
  });
}

export async function revertAccessTokenToSold(
  tx: Prisma.TransactionClient,
  params: { orgId: string; resellerId: string; credentialId: string }
): Promise<void> {
  const existing = await tx.credential.findFirst({
    where: { id: params.credentialId, orgId: params.orgId, resellerId: params.resellerId, deletedAt: null },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw Object.assign(new Error('Access token not found.'), { status: 404, code: 'NOT_FOUND' });
  }

  const revertable = new Set(['ACTIVATED', 'PAUSED']);
  if (!revertable.has(existing.status)) {
    throw Object.assign(new Error(`Tokens in status ${existing.status} cannot be reverted to sold.`), {
      status: 409,
      code: 'CANNOT_REVERT',
    });
  }

  await tx.credential.update({
    where: { id: existing.id },
    data: {
      status: 'SOLD',
      activatedAt: null,
      singleSessionResellerUnlockAt: null,
    },
  });
}
