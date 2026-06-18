import type { PrismaClient } from '@/generated/prisma/client';

const REVOKE_WINDOW_KEY = 'commerce_access_token_revoke_window_minutes';
const DEFAULT_REVOKE_WINDOW_MINUTES = 15;

function toPositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export async function loadAccessTokenRevokeWindowMinutes(
  prisma: PrismaClient
): Promise<number> {
  const row = await prisma.appSetting.findUnique({
    where: { key: REVOKE_WINDOW_KEY },
    select: { value: true },
  });
  return toPositiveInt(row?.value, DEFAULT_REVOKE_WINDOW_MINUTES);
}
