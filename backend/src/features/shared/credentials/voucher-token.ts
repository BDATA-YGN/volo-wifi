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

type TokenClient = Pick<Prisma.TransactionClient, 'credential' | 'credentialArchive' | 'radiusSession'>;

/**
 * True when this code is still bound to a live credential, an archived
 * credential, or an open RADIUS session (same User-Name). Reusing a code
 * after delete/archive would inherit Simultaneous-Use and quota history.
 */
export async function isVoucherCodeTaken(tx: TokenClient, token: string): Promise<boolean> {
  const code = token.trim();
  if (!code) return true;

  const [live, archived, openSession] = await Promise.all([
    tx.credential.findFirst({
      where: {
        OR: [
          { token: code },
          { username: { equals: code, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    }),
    tx.credentialArchive.findFirst({
      where: {
        OR: [
          { token: code },
          { username: { equals: code, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    }),
    tx.radiusSession.findFirst({
      where: {
        stoppedAt: null,
        userName: { in: [code, code.toUpperCase()] },
      },
      select: { id: true },
    }),
  ]);

  return Boolean(live || archived || openSession);
}

function rememberTakenCode(taken: Set<string>, codes: string[], value: string | null | undefined) {
  if (!value) return;
  const upper = value.trim().toUpperCase();
  if (codes.includes(upper)) taken.add(upper);
}

/** Which of these codes are already bound to a credential, archive, or open RADIUS session. */
export async function findTakenVoucherCodes(tx: TokenClient, codes: string[]): Promise<Set<string>> {
  const unique = [...new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean))];
  const taken = new Set<string>();
  if (unique.length === 0) return taken;

  const [live, archived, openSessions] = await Promise.all([
    tx.credential.findMany({
      where: {
        OR: [
          { token: { in: unique } },
          { username: { in: unique, mode: 'insensitive' } },
        ],
      },
      select: { token: true, username: true },
    }),
    tx.credentialArchive.findMany({
      where: {
        OR: [
          { token: { in: unique } },
          { username: { in: unique, mode: 'insensitive' } },
        ],
      },
      select: { token: true, username: true },
    }),
    tx.radiusSession.findMany({
      where: { stoppedAt: null, userName: { in: unique } },
      select: { userName: true },
    }),
  ]);

  for (const row of live) {
    rememberTakenCode(taken, unique, row.token);
    rememberTakenCode(taken, unique, row.username);
  }
  for (const row of archived) {
    rememberTakenCode(taken, unique, row.token);
    rememberTakenCode(taken, unique, row.username);
  }
  for (const row of openSessions) {
    rememberTakenCode(taken, unique, row.userName);
  }
  return taken;
}

/** Generate tokens unique across live credentials, archives, and open RADIUS sessions. */
export async function generateUniqueAlphanumericTokens(
  tx: TokenClient,
  count: number,
  options?: { length?: number; maxAttempts?: number }
): Promise<string[]> {
  if (count <= 0) return [];
  const length = options?.length ?? VOUCHER_TOKEN_LENGTH;
  const maxAttempts = options?.maxAttempts ?? 24;
  const accepted: string[] = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < maxAttempts && accepted.length < count; attempt += 1) {
    const candidates: string[] = [];
    const need = count - accepted.length;
    while (candidates.length < need) {
      const token = generateAlphanumericToken(length);
      if (seen.has(token)) continue;
      seen.add(token);
      candidates.push(token);
    }
    const taken = await findTakenVoucherCodes(tx, candidates);
    for (const token of candidates) {
      if (!taken.has(token)) accepted.push(token);
    }
  }

  if (accepted.length < count) {
    throw Object.assign(new Error('Failed to generate a unique voucher code.'), {
      status: 500,
      code: 'TOKEN_GENERATION_FAILED',
    });
  }
  return accepted;
}

/** Generate a token that is unique across live credentials, archives, and open RADIUS sessions. */
export async function generateUniqueAlphanumericToken(
  tx: TokenClient,
  options?: { length?: number; maxAttempts?: number }
): Promise<string> {
  const [token] = await generateUniqueAlphanumericTokens(tx, 1, options);
  return token!;
}
