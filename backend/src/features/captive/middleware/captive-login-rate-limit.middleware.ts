import type { NextFunction, Request, Response } from 'express';
import Container from 'typedi';
import type { PrismaClient } from '@/generated/prisma/client';
import { CredentialType } from '@/generated/prisma/enums';
import { responseError } from '@/utils/api-response';
import { resolveCaptiveNasClientIp } from '@/features/captive/utils/captive-client-ip';
import { captiveErrors } from '@/features/captive/messages';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const SETTINGS_CACHE_MS = 30_000;
const APP_SETTING_KEY = 'captive_login_ip_rate_limit_enabled';

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const parseBool = (value: string | undefined | null, fallback: boolean): boolean => {
  if (value == null || value.trim() === '') return fallback;
  const v = value.trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(v)) return false;
  if (['true', '1', 'yes', 'on'].includes(v)) return true;
  return fallback;
};

/**
 * Env wins when explicitly set (Dokploy / .env).
 * Otherwise AppSetting `captive_login_ip_rate_limit_enabled` (default on).
 */
const ENV_IP_RATE_LIMIT =
  process.env.CAPTIVE_LOGIN_IP_RATE_LIMIT_ENABLED === undefined
    ? null
    : parseBool(process.env.CAPTIVE_LOGIN_IP_RATE_LIMIT_ENABLED, true);

const LOGIN_IP_MAX = parsePositiveInt(process.env.CAPTIVE_LOGIN_IP_MAX, 30);
const LOGIN_IP_WINDOW_MS = parsePositiveInt(process.env.CAPTIVE_LOGIN_IP_WINDOW_MS, FIFTEEN_MINUTES_MS);
const LOGIN_CREDENTIAL_MAX = parsePositiveInt(process.env.CAPTIVE_LOGIN_CREDENTIAL_MAX, 8);
const LOGIN_CREDENTIAL_WINDOW_MS = parsePositiveInt(
  process.env.CAPTIVE_LOGIN_CREDENTIAL_WINDOW_MS,
  FIFTEEN_MINUTES_MS,
);

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

let cachedIpLimitEnabled: { value: boolean; expiresAt: number } | null = null;

function pruneExpired(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function readNasParams(req: Request): Record<string, unknown> | null {
  return req.body?.nasParams != null && typeof req.body.nasParams === 'object'
    ? (req.body.nasParams as Record<string, unknown>)
    : null;
}

async function isIpRateLimitEnabled(): Promise<boolean> {
  if (ENV_IP_RATE_LIMIT != null) return ENV_IP_RATE_LIMIT;

  const now = Date.now();
  if (cachedIpLimitEnabled && cachedIpLimitEnabled.expiresAt > now) {
    return cachedIpLimitEnabled.value;
  }

  try {
    const prisma = Container.get<PrismaClient>('prismaClient');
    const row = await prisma.appSetting.findUnique({
      where: { key: APP_SETTING_KEY },
      select: { value: true },
    });
    const value = parseBool(row?.value, true);
    cachedIpLimitEnabled = { value, expiresAt: now + SETTINGS_CACHE_MS };
    return value;
  } catch {
    return true;
  }
}

function hitRateLimit(
  res: Response,
  key: string,
  windowMs: number,
  maxAttempts: number,
): boolean {
  const now = Date.now();
  pruneExpired(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count > maxAttempts) {
    responseError(res, 429, {
      code: 'TOO_MANY_REQUESTS',
      message: captiveErrors.TOO_MANY_REQUESTS,
    });
    return true;
  }
  return false;
}

/**
 * Same-IP login throttle keyed only on NAS-reported client IP.
 * Skips when disabled or when nasParams has no client IP (avoids bucketizing
 * every browser behind the portal / CGNAT public address).
 */
export async function captiveLoginIpRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!(await isIpRateLimitEnabled())) {
      next();
      return;
    }

    const nasClientIp = resolveCaptiveNasClientIp(readNasParams(req));
    if (!nasClientIp) {
      next();
      return;
    }

    if (hitRateLimit(res, `login:nas-ip:${nasClientIp}`, LOGIN_IP_WINDOW_MS, LOGIN_IP_MAX)) {
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function captiveLoginCredentialKey(req: Request): string {
  const body = req.body ?? {};
  if (body.type === CredentialType.USER_PASSWORD && body.username) {
    return `login:user:${String(body.username).trim().toLowerCase()}`;
  }
  if (body.token) {
    return `login:token:${String(body.token).trim().toUpperCase()}`;
  }
  const nasClientIp = resolveCaptiveNasClientIp(readNasParams(req));
  return `login:nas-ip:${nasClientIp || 'unknown'}`;
}

export function captiveLoginCredentialRateLimit(req: Request, res: Response, next: NextFunction) {
  if (
    hitRateLimit(
      res,
      captiveLoginCredentialKey(req),
      LOGIN_CREDENTIAL_WINDOW_MS,
      LOGIN_CREDENTIAL_MAX,
    )
  ) {
    return;
  }
  next();
}
