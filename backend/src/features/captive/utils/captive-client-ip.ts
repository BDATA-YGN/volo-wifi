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

function isPrivateOrLoopback(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === 'localhost') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
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
 * Resolve the WiFi client IP for captive portal audit/rate-limit logs.
 * Prefers proxy headers; falls back to NAS redirect params when the request
 * arrives via the Next.js `/portal-api` proxy (loopback/private hop).
 */
export function resolveCaptiveClientIp(
  req: Request,
  nasParams?: Record<string, unknown> | null,
): string | null {
  const fromRequest = normalizeIp(resolveClientIp(req));
  if (fromRequest && !isPrivateOrLoopback(fromRequest)) {
    return fromRequest;
  }

  const fromNas = readNasString(nasParams, [
    'ip',
    'wlanuserip',
    'userip',
    'user_ip',
    'client_ip',
  ]);
  if (fromNas) return fromNas;

  return fromRequest;
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
