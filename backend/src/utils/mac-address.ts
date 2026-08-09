/**
 * MAC address helpers — any common wire format → one compare key / storage form.
 *
 * Accepts: `aa:bb:…`, `aa-bb-…`, `aabb.cccc.dddd`, `AABBCCDDEEFF`, mixed case, spaces.
 */

/** 12 lowercase hex digits with no separators — use for equality checks. */
export function normalizeMacKey(mac: string | null | undefined): string | null {
  if (mac == null) return null;
  let raw = String(mac).trim();
  if (!raw) return null;

  if (raw.includes('%')) {
    try {
      raw = decodeURIComponent(raw);
    } catch {
      // keep raw
    }
  }

  const hex = raw.toLowerCase().replace(/[^a-f0-9]/g, '');
  return hex.length === 12 ? hex : null;
}

/** Canonical storage / display: `aa:bb:cc:dd:ee:ff`. */
export function formatMacColon(mac: string | null | undefined): string | null {
  const hex = normalizeMacKey(mac);
  if (!hex) return null;
  return hex.match(/.{2}/g)!.join(':');
}

export function macKeysEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizeMacKey(a);
  const right = normalizeMacKey(b);
  return left != null && left === right;
}
