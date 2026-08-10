import type { Request } from 'express';
import { resolveClientIp } from '@/utils/request-ip';
import { normalizeMacKey } from '@/utils/mac-address';

function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  let value = ip.trim();
  if (!value) return null;
  if (value.startsWith('::ffff:')) value = value.slice(7);
  if (value === '::1' || value === '0:0:0:0:0:0:0:1') value = '127.0.0.1';
  return value;
}

function coerceNasString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value) && value.length > 0) return coerceNasString(value[0]);
  return null;
}

function readNasString(
  nasParams: Record<string, unknown> | null | undefined,
  keys: string[],
): string | null {
  if (!nasParams) return null;
  const lowerMap = new Map(
    Object.entries(nasParams).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const key of keys) {
    const coerced = coerceNasString(lowerMap.get(key.toLowerCase()));
    if (coerced) return coerced;
  }
  return null;
}

/**
 * Wi‑Fi client IP from NAS redirect params only (MikroTik `ip`, Ruijie `wlanuserip`, …).
 * Does not fall back to request/proxy headers — those are often the portal edge IP.
 */
export function resolveCaptiveNasClientIp(
  nasParams?: Record<string, unknown> | null,
): string | null {
  return normalizeIp(
    readNasString(nasParams, [
      'ip',
      'wlanuserip',
      'userip',
      'user_ip',
      'client_ip',
    ]),
  );
}

/**
 * Resolve the WiFi client IP for captive portal session / audit.
 *
 * Prefer NAS redirect params; fall back to request/proxy headers when NAS
 * did not send a client address. Prefer {@link resolveCaptiveNasClientIp}
 * for login rate-limiting (same-IP) so shared portal edges are not bucketed.
 */
export function resolveCaptiveClientIp(
  req: Request,
  nasParams?: Record<string, unknown> | null,
): string | null {
  const fromNas = resolveCaptiveNasClientIp(nasParams);
  if (fromNas) return fromNas;

  return normalizeIp(resolveClientIp(req));
}

export function resolveCaptiveClientMac(
  req: Request,
  nasParams?: Record<string, unknown> | null,
): string | undefined {
  const header = req.headers['x-calling-station-id'];
  if (typeof header === 'string' && header.trim()) return header.trim();

  const fromNas = readNasString(nasParams, [
    'mac',
    'usermac',
    'user_mac',
    'client_mac',
    'calling_station_id',
  ]);
  return fromNas ?? undefined;
}

/**
 * Canonical MAC compare key (12 lowercase hex digits).
 * Aliases {@link normalizeMacKey} for captive login / site-lock.
 */
export function normalizeCaptiveMac(mac: string | null | undefined): string | null {
  return normalizeMacKey(mac);
}
