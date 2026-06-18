import type { NextFunction, Request, Response } from 'express';
import { CustomException } from '@/utils/exception';
import { resolveClientIp } from '@/utils/request-ip';
import { AUTH_RATE_LIMITS } from './auth.constants';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function createIpRateLimiter(windowMs: number, maxAttempts: number, scope: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ip = resolveClientIp(req) || 'unknown';
    const key = `${scope}:${ip}`;
    const now = Date.now();

    pruneExpired(now);

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > maxAttempts) {
      const secondsRemaining = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      throw new CustomException(
        429,
        'RATE_LIMITED',
        'Too many requests. Please try again later.',
        { scope, secondsRemaining, maxAttempts },
      );
    }

    next();
  };
}

export const MobileAuthLoginRateLimit = createIpRateLimiter(
  AUTH_RATE_LIMITS.login.windowMs,
  AUTH_RATE_LIMITS.login.maxAttempts,
  'mobile-auth-login',
);

export const MobileAuthRefreshRateLimit = createIpRateLimiter(
  AUTH_RATE_LIMITS.refresh.windowMs,
  AUTH_RATE_LIMITS.refresh.maxAttempts,
  'mobile-auth-refresh',
);
