import PrismaDBConnection from '@/prisma/prisma-client';
import { normalizeMacKey } from '@/utils/mac-address';

const prisma = PrismaDBConnection.getConnection();

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

function normalizeNasIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  let value = ip.trim();
  if (!value) return null;
  if (value.startsWith('::ffff:')) value = value.slice(7);
  return value;
}

function normalizeNasIdentifier(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value.trim();
}

export type ResolveRequestStationResult =
  | { status: 'matched'; station: { id: string; stationSizeId: string | null } }
  | { status: 'unknown' }
  | { status: 'ambiguous' };

/**
 * Resolve the request WiFi site from captive redirect `nasParams`.
 *
 * OR match (any one hit is enough):
 * - NASID / nasid / nas_id → WifiStation.nasIdentifier
 * - nas_ip / nasip / wlanacip → WifiStation.radiusClientIp
 * - nas_mac → WifiStation.nasMac (any MAC format; compared via normalizeMacKey)
 *
 * NAS-Identifier OR NAS MAC alone qualifies when that param is present.
 */
export async function resolveRequestStationFromNasParams(options: {
  orgId: string;
  nasParams: Record<string, unknown> | null | undefined;
  preferStationId?: string | null;
}): Promise<ResolveRequestStationResult> {
  const { orgId, nasParams, preferStationId } = options;

  const nasId = normalizeNasIdentifier(
    readNasString(nasParams, ['NASID', 'nasid', 'nas_id', 'nas_identifier', 'nasIdentifier']),
  );
  const nasIp = normalizeNasIp(
    readNasString(nasParams, ['nas_ip', 'nasip', 'wlanacip', 'nasIp', 'ap_ip']),
  );
  const nasMacKey = normalizeMacKey(
    readNasString(nasParams, ['nas_mac', 'nasmac', 'ap_mac', 'apmac', 'gw_mac', 'gateway_mac']),
  );

  if (!nasId && !nasIp && !nasMacKey) {
    return { status: 'unknown' };
  }

  const candidates = new Map<string, { id: string; stationSizeId: string | null }>();

  const addRows = (
    rows: Array<{ id: string; stationSizeId: string | null; nasMac?: string | null }>,
    macKeyOnly?: string | null,
  ) => {
    for (const row of rows) {
      if (macKeyOnly) {
        const storedKey = normalizeMacKey(row.nasMac);
        if (!storedKey || storedKey !== macKeyOnly) continue;
      }
      candidates.set(row.id, { id: row.id, stationSizeId: row.stationSizeId });
    }
  };

  if (nasId) {
    const rows = await prisma.wifiStation.findMany({
      where: {
        orgId,
        deletedAt: null,
        nasIdentifier: { equals: nasId, mode: 'insensitive' },
      },
      select: { id: true, stationSizeId: true },
    });
    addRows(rows);
  }

  if (nasIp) {
    const rows = await prisma.wifiStation.findMany({
      where: {
        orgId,
        deletedAt: null,
        radiusClientIp: nasIp,
      },
      select: { id: true, stationSizeId: true },
    });
    addRows(rows);
  }

  if (nasMacKey) {
    const rows = await prisma.wifiStation.findMany({
      where: {
        orgId,
        deletedAt: null,
        nasMac: { not: null },
      },
      select: { id: true, stationSizeId: true, nasMac: true },
    });
    addRows(rows, nasMacKey);
  }

  if (candidates.size === 0) {
    return { status: 'unknown' };
  }

  if (preferStationId && candidates.has(preferStationId)) {
    return { status: 'matched', station: candidates.get(preferStationId)! };
  }

  if (candidates.size > 1) {
    return { status: 'ambiguous' };
  }

  const [only] = candidates.values();
  return { status: 'matched', station: only };
}
