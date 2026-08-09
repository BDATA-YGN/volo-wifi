import type { Request } from 'express';
import PrismaDBConnection from '@/prisma/prisma-client';
import { logger } from '@/logging/logger';
import { resolveClientIp, resolveUserAgent } from '@/utils/request-ip';

const prisma = PrismaDBConnection.getConnection();

/**
 * Fixed set of values we write to `LoginLog.type`. Keeping this small (instead
 * of free-form strings) lets the audit-logs UI filter and tag them reliably.
 */
export type LoginLogType = 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'ACCOUNT_LOCKED';

export type LoginLogPlatform =
  | 'WEB'
  | 'IOS'
  | 'ANDROID'
  | 'MOBILE'
  | 'OTHER';

export interface RecordLoginInput {
  /** Admin UUID. Required for LOGIN, allowed-null for forensic edge cases. */
  userId?: string | null;
  userEmail?: string | null;
  type: LoginLogType;
  /** Express request — used to derive IP, UA, platform, device. */
  req: Request;
  /** Optional override when frontend/auth already resolved the browser IP. */
  ipAddress?: string | null;
}

/** Tiny, dependency-free UA classifier — good enough for sign-in history. */
const parsePlatform = (ua: string | undefined): LoginLogPlatform => {
  if (!ua) return 'OTHER';
  const s = ua.toLowerCase();
  if (s.includes('iphone') || s.includes('ipad') || s.includes('ios')) return 'IOS';
  if (s.includes('android')) return 'ANDROID';
  if (s.includes('mobile')) return 'MOBILE';
  if (
    s.includes('mozilla') ||
    s.includes('chrome') ||
    s.includes('safari') ||
    s.includes('firefox') ||
    s.includes('edge')
  ) {
    return 'WEB';
  }
  return 'OTHER';
};

/**
 * Best-effort device label derived from the User-Agent header. Truncated to
 * 240 chars so the column stays cheap to index/scan.
 */
const parseDevice = (ua: string | undefined): string | null => {
  if (!ua) return null;
  return ua.slice(0, 240);
};

/**
 * Writes a single row to `tbl_login_log`. Designed to be called with `void` —
 * the auth controller does NOT await it so logging never blocks the response.
 * Errors are caught and only logged, never thrown.
 */
export const recordLogin = async (input: RecordLoginInput): Promise<void> => {
  try {
    const userAgent = resolveUserAgent(input.req) || undefined;
    await prisma.loginLog.create({
      data: {
        userId: input.userId || null,
        userEmail: input.userEmail || null,
        type: input.type,
        loginDateTime: new Date(),
        loginPlatform: parsePlatform(userAgent),
        loginDevices: parseDevice(userAgent),
        ipAddress: input.ipAddress ?? resolveClientIp(input.req),
      },
    });
  } catch (err) {
    logger.warn('[login-log] Failed to record login event', { err });
  }
};
