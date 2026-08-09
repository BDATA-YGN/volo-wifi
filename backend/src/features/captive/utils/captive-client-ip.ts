import type { Request } from 'express';
import { resolveClientIp } from '@/utils/request-ip';

function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  let value = ip.trim();
  if (!value) return null;
  if (value.startsWith('::ffff:')) value = value.slice(7);
  if (value === '::1' || value === '0:0:0:0:0:0:0:1') value = '127.0.0.1';
  return value;
}

function readNasString(nasParams: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!nasParams) return null;
  for (const key of keys) {
    const value = nasParams[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Resolve the WiFi client IP for captive portal session / audit / rate-limit.
 *
 * Prefer NAS redirect params (MikroTik `ip`, Ruijie `wlanuserip`, …) — that is
 * the station client address. Request/proxy headers often show the portal
 * server or edge hop (public Droplet IP), which must not win when NAS has a value.
 */
export function resolveCaptiveClientIp(
  req: Request,
  nasParams?: Record<string, unknown> | null,
): string | null {
  const fromNas = normalizeIp(
    readNasString(nasParams, [
      'ip',
      'wlanuserip',
      'userip',
      'user_ip',
      'client_ip',
    ]),
  );
  if (fromNas) return fromNas;

  return normalizeIp(resolveClientIp(req));
}

export function resolveCaptiveClientMac(
  req: Request,
  nasParams?: Record<string, unknown> | null,
): string | undefined {
  const header = req.headers['x-calling-station-id'];
  if (typeof header === 'string' && header.trim()) return header.trim();

  const fromNas = readNasString(nasParams, ['mac', 'usermac', 'user_mac', 'client_mac']);
  return fromNas ?? undefined;
}

/** Strip separators for MAC compare (`aa:bb` / `AABB` / `aa-bb` → `aabb…`). */
export function normalizeCaptiveMac(mac: string | null | undefined): string | null {
  if (!mac?.trim()) return null;
  const hex = mac.trim().toLowerCase().replace(/[^a-f0-9]/g, '');
  return hex.length >= 8 ? hex : null;
}
