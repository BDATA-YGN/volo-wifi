import type { NextFunction, Request, Response } from 'express';
import { CredentialType } from '@/generated/prisma/enums';
import { responseError } from '@/utils/api-response';
import { resolveCaptiveClientIp } from '@/features/captive/utils/captive-client-ip';
import { captiveErrors } from '@/features/captive/messages';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const CAPTIVE_LOGIN_IP_RATE_LIMIT_ENABLED =
  process.env.CAPTIVE_LOGIN_IP_RATE_LIMIT_ENABLED !== 'false' &&
  process.env.CAPTIVE_LOGIN_IP_RATE_LIMIT_ENABLED !== '0';

const LOGIN_IP_MAX = parsePositiveInt(process.env.CAPTIVE_LOGIN_IP_MAX, 30);
const LOGIN_IP_WINDOW_MS = parsePositiveInt(process.env.CAPTIVE_LOGIN_IP_WINDOW_MS, FIFTEEN_MINUTES_MS);
const LOGIN_CREDENTIAL_MAX = parsePositiveInt(process.env.CAPTIVE_LOGIN_CREDENTIAL_MAX, 8);
const LOGIN_CREDENTIAL_WINDOW_MS = parsePositiveInt(
  process.env.CAPTIVE_LOGIN_CREDENTIAL_WINDOW_MS,
  FIFTEEN_MINUTES_MS,
);

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function pruneExpired(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function createRateLimiter(windowMs: number, maxAttempts: number, keyFn: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn(req);
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
      return;
    }

    next();
  };
}

function loginIpKey(req: Request): string {
  const nasParams =
    req.body?.nasParams != null && typeof req.body.nasParams === 'object'
      ? (req.body.nasParams as Record<string, unknown>)
      : null;
  return `login:ip:${resolveCaptiveClientIp(req, nasParams) || 'unknown'}`;
}

export function captiveLoginCredentialKey(req: Request): string {
  const body = req.body ?? {};
  if (body.type === CredentialType.USER_PASSWORD && body.username) {
    return `login:user:${String(body.username).trim().toLowerCase()}`;
  }
  if (body.token) {
    return `login:token:${String(body.token).trim().toUpperCase()}`;
  }
  return loginIpKey(req);
}

export const captiveLoginIpRateLimit = CAPTIVE_LOGIN_IP_RATE_LIMIT_ENABLED
  ? createRateLimiter(LOGIN_IP_WINDOW_MS, LOGIN_IP_MAX, loginIpKey)
  : (_req: Request, _res: Response, next: NextFunction) => next();

export const captiveLoginCredentialRateLimit = createRateLimiter(
  LOGIN_CREDENTIAL_WINDOW_MS,
  LOGIN_CREDENTIAL_MAX,
  captiveLoginCredentialKey,
);
