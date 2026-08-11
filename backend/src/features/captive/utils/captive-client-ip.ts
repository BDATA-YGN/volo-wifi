import type { Request } from 'express';
import { normalizeMacKey } from '@/utils/mac-address';

function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  let value = ip.trim();
  if (!value) return null;
  if (value.startsWith('::ffff:')) value = value.slice(7);
  if (value === '::1' || value === '0:0:0:0:0:0:0:1') value = '127.0.0.1';
  return value;
}

/**
 * Public IPs that belong to our hosting / portal edge — never treat as the
 * Wi‑Fi client's device address (NAS `ip` / `wlanuserip` / Framed-IP is authoritative).
 *
 * Extend via env `CAPTIVE_IGNORE_CLIENT_IPS=ip1,ip2`.
 */
const DEFAULT_IGNORED_CLIENT_IPS = ['159.223.63.109'] as const;

export function getIgnoredCaptiveClientIps(): Set<string> {
  const ignored = new Set<string>();
  for (const ip of DEFAULT_IGNORED_CLIENT_IPS) {
    const normalized = normalizeIp(ip);
    if (normalized) ignored.add(normalized);
  }
  const fromEnv = process.env.CAPTIVE_IGNORE_CLIENT_IPS ?? '';
  for (const part of fromEnv.split(',')) {
    const normalized = normalizeIp(part);
    if (normalized) ignored.add(normalized);
  }
  return ignored;
}

/** True when this address is a known portal/hosting hop, not a subscriber device. */
export function isIgnoredCaptiveClientIp(ip: string | null | undefined): boolean {
  const normalized = normalizeIp(ip);
  return Boolean(normalized && getIgnoredCaptiveClientIps().has(normalized));
}

/** Keep NAS/device IPs; drop hosting/edge hops. */
export function sanitizeCaptiveClientIp(ip: string | null | undefined): string | null {
  const normalized = normalizeIp(ip);
  if (!normalized || isIgnoredCaptiveClientIp(normalized)) return null;
  return normalized;
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
  return sanitizeCaptiveClientIp(
    readNasString(nasParams, [
      'ip',
      'wlanuserip',
      'userip',
      'user_ip',
      'client_ip',
      'staip',
      'sta_ip',
      'ue-ip',
      'ue_ip',
    ]),
  );
}

/**
 * Resolve the WiFi client IP for captive portal session / audit.
 *
 * Uses NAS redirect params only. Request/proxy headers are ignored because they
 * usually resolve to the captive portal hosting IP (e.g. DigitalOcean droplet),
 * not the subscriber device address assigned/reported by the NAS.
 */
export function resolveCaptiveClientIp(
  _req: Request,
  nasParams?: Record<string, unknown> | null,
): string | null {
  return resolveCaptiveNasClientIp(nasParams);
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
