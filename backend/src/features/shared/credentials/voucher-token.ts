import crypto from 'crypto';
import { Prisma } from '@/generated/prisma/client';

const TOKEN_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export const VOUCHER_TOKEN_LENGTH = 6;

/** Uppercase alphanumeric voucher code (default 6 characters). */
export function generateAlphanumericToken(length = VOUCHER_TOKEN_LENGTH): string {
  const bytes = crypto.randomBytes(length);
  let token = '';
  for (let i = 0; i < length; i += 1) {
    token += TOKEN_CHARSET[bytes[i]! % TOKEN_CHARSET.length];
  }
  return token;
}

type TokenClient = Pick<Prisma.TransactionClient, 'credential'>;

/** Generate a token that is unique across all credentials (active table). */
export async function generateUniqueAlphanumericToken(
  tx: TokenClient,
  options?: { length?: number; maxAttempts?: number }
): Promise<string> {
  const length = options?.length ?? VOUCHER_TOKEN_LENGTH;
  const maxAttempts = options?.maxAttempts ?? 24;
  const seen = new Set<string>();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let token = generateAlphanumericToken(length);
    while (seen.has(token)) {
      token = generateAlphanumericToken(length);
    }
    seen.add(token);

    const existing = await tx.credential.findFirst({
      where: { token },
      select: { id: true },
    });
    if (!existing) {
      return token;
    }
  }

  throw Object.assign(new Error('Failed to generate a unique voucher code.'), {
    status: 500,
    code: 'TOKEN_GENERATION_FAILED',
  });
}
