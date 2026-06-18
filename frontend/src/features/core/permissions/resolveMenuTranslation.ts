function walkMenuMessages(
  menuMessages: Record<string, unknown> | undefined,
  key?: string | null
): unknown {
  if (!key) return undefined;

  const parts = key.split(".");
  let cursor: unknown = menuMessages ?? {};

  for (const part of parts) {
    if (
      cursor &&
      typeof cursor === "object" &&
      part in (cursor as Record<string, unknown>)
    ) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return cursor;
}

/** Returns the raw message node at a dotted path (string, object with `$self`, etc.). */
export function getMenuMessageNode(
  menuMessages: Record<string, unknown> | undefined,
  key?: string | null
): unknown {
  return walkMenuMessages(menuMessages, key);
}

/**
 * Resolves a dotted menu translation key (e.g. `menus.wifi.billing.subscription`)
 * against the loaded `menu` message tree.
 *
 * Supports branch nodes that carry a `$self` label alongside child keys
 * (e.g. `billing.subscription.$self` + `billing.subscription.sites`).
 */
export function resolveMenuTranslation(
  menuMessages: Record<string, unknown> | undefined,
  key?: string | null
): string | undefined {
  if (!key) return "";

  const cursor = walkMenuMessages(menuMessages, key);
  if (cursor === undefined) return undefined;

  if (typeof cursor === "string") return cursor;

  if (cursor && typeof cursor === "object" && "$self" in (cursor as Record<string, unknown>)) {
    const self = (cursor as Record<string, unknown>).$self;
    return typeof self === "string" ? self : undefined;
  }

  return undefined;
}
