/** Generic login failure — avoids username enumeration. */
export const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password';

/** Bcrypt processes at most 72 bytes; cap input to reduce CPU abuse. */
export const AUTH_PASSWORD_MAX_LENGTH = 128;

export const AUTH_USERNAME_MAX_LENGTH = 64;

/** In-memory IP rate limits (per process). Use Redis for multi-instance production. */
export const AUTH_RATE_LIMITS = {
  login: { windowMs: 15 * 60_000, maxAttempts: 30 },
  refresh: { windowMs: 15 * 60_000, maxAttempts: 60 },
} as const;

/** Precomputed bcrypt hash used for constant-time work when the username is unknown. */
export const DUMMY_PASSWORD_HASH =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
