import type { Request } from 'express';

/**
 * Headers we accept as carriers of the original client IP, in priority order.
 *
 * - `cf-connecting-ip`  — set by Cloudflare; always the true client.
 * - `true-client-ip`    — set by Akamai / Cloudflare Enterprise.
 * - `x-forwarded-for`   — RFC standard chain; **first hop is the client** when
 *                         added by the edge proxy (check before `x-real-ip`).
 * - `x-real-ip`         — immediate upstream as seen by the last proxy; can be
 *                         the frontend server when Next.js calls the API.
 * - `x-client-ip`       — set by some frontend gateways.
 *
 * These headers can be **spoofed** by direct API clients. Pair them with
 * `app.set('trust proxy', …)` so Express only honours them when the request
 * actually comes from a trusted hop. See `backend/src/app.ts`.
 */
const TRUSTED_EDGE_HEADERS = ['cf-connecting-ip', 'true-client-ip'] as const;

/**
 * Cleans up the addresses Node / Express hand us so they're consistent:
 *   - `::ffff:192.0.2.5` (IPv4-mapped IPv6) → `192.0.2.5`
 *   - `::1`, `0:0:0:0:0:0:0:1` (IPv6 loopback) → `127.0.0.1`
 *   - leading/trailing whitespace stripped.
 */
const normalize = (ip: string | null | undefined): string | null => {
  if (!ip) return null;
  let v = ip.trim();
  if (!v) return null;
  if (v.startsWith('::ffff:')) v = v.slice(7);
  if (v === '::1' || v === '0:0:0:0:0:0:0:1') v = '127.0.0.1';
  return v;
};

const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;

/** True when the value looks like a single IPv4/IPv6 address (not a list or junk). */
export const isValidClientIp = (ip: string | null | undefined): boolean => {
  const value = normalize(ip);
  if (!value) return false;
  if (IPV4_RE.test(value)) return true;
  if (value.includes(':') && IPV6_RE.test(value) && value.length <= 45) return true;
  return false;
};

const readHeader = (req: Request, key: string): string | undefined => {
  const raw = req.headers[key];
  if (Array.isArray(raw)) return raw[0];
  return raw;
};

const firstForwardedFor = (req: Request): string | null => {
  const fwd = readHeader(req, 'x-forwarded-for');
  if (!fwd) return null;
  return normalize(fwd.split(',')[0]);
};

/**
 * Best-effort resolution of the **end-user** client IP.
 *
 * Walks proxy headers first, then falls back to Express's already-parsed
 * `req.ip`, and finally the raw socket. Returns `null` when nothing usable
 * can be determined (very rare; usually only happens in synthetic tests).
 */
export const resolveClientIp = (req: Request): string | null => {
  for (const header of TRUSTED_EDGE_HEADERS) {
    const value = normalize(readHeader(req, header));
    if (value) return value;
  }

  const fromXff = firstForwardedFor(req);
  if (fromXff) return fromXff;

  const fromRealIp = normalize(readHeader(req, 'x-real-ip'));
  if (fromRealIp) return fromRealIp;

  const fromClientIp = normalize(readHeader(req, 'x-client-ip'));
  if (fromClientIp) return fromClientIp;

  const fromExpress = normalize(req.ip);
  if (fromExpress) return fromExpress;

  const fromSocket = normalize(req.socket?.remoteAddress);
  return fromSocket;
};

/**
 * Auth / audit IP: prefer an explicit client hint from the Next.js frontend
 * (login body `clientIp`) when it is a valid address; otherwise use headers.
 * Mirrors captive NAS-param preference so server/edge public hops do not win.
 */
export const resolveRequestClientIp = (
  req: Request,
  preferred?: string | null,
): string | null => {
  const fromPreferred = normalize(preferred);
  if (fromPreferred && isValidClientIp(fromPreferred)) return fromPreferred;
  return resolveClientIp(req);
};

/** Reads the User-Agent header in the same forgiving way as `resolveClientIp`. */
export const resolveUserAgent = (req: Request): string | null => {
  const value = readHeader(req, 'user-agent');
  return value ? value.trim() : null;
};
