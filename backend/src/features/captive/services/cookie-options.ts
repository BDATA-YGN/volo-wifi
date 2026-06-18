import type { CookieOptions } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

/** Cookie options aligned with legacy captive portal (access_token / refresh_token). */
export function captiveAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: isProduction,
    secure: isProduction,
    path: '/',
  };
}

export function captiveAuthCookieOptionsStrict(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  };
}

export const CAPTIVE_ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
export const CAPTIVE_REFRESH_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
